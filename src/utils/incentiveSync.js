import { supabase } from '../../supabase';

/**
 * Synchronizes daily incentive data for the current agent.
 * Checks for missing records from the start of the month and updates them.
 */
export const syncDailyIncentives = async (username) => {
    if (!username) return;

    try {
        // 1. Fetch user target
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('target')
            .eq('username', username)
            .single();

        if (userError || !userData) return;
        const currentTarget = userData.target || 0;

        // 2. Fetch existing sync records for the month to preserve "applied_target"
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toLocaleDateString('en-CA');

        const { data: existingRecords } = await supabase
            .from('agent_incentives')
            .select('*')
            .eq('agent_username', username)
            .gte('record_date', startOfMonth);

        const recordHistory = {};
        existingRecords?.forEach(r => recordHistory[r.record_date] = r);

        // 3. Fetch all disbursed loans for the agent
        const { data: loans, error: loanError } = await supabase
            .from('client_logins')
            .select('eligibility, updated_at')
            .eq('loginned_by', username)
            .eq('status', 'disbursed');

        if (loanError) throw loanError;

        //  group disbursements by Date
        const disbursementsByDate = {};
        loans?.forEach(loan => {
            const dateStr = new Date(loan.updated_at).toLocaleDateString('en-CA');
            disbursementsByDate[dateStr] = (disbursementsByDate[dateStr] || 0) + (parseFloat(loan.eligibility) || 0);
        });

        // 4. Determine date range
        const syncRecords = [];
        let cumulativeMTD = 0;
        const todayStr = today.toLocaleDateString('en-CA');

        // Iterate through each day of the month
        for (let d = new Date(today.getFullYear(), today.getMonth(), 1); d <= today; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toLocaleDateString('en-CA');
            const dailyAmount = disbursementsByDate[dateStr] || 0;
            cumulativeMTD += dailyAmount;

            // PRESERVE HISTORY: 
            // - If it's a PAST date: strictly use the locked 'applied_target' from that day.
            // - If it's TODAY: use the current target (allows mid-day target adjustments to take effect).
            const existing = recordHistory[dateStr];
            const isPastDate = dateStr < todayStr;
            const appliedTarget = (isPastDate && existing?.applied_target) ? existing.applied_target : currentTarget;

            let incentive = 0;
            if (cumulativeMTD > appliedTarget && appliedTarget > 0) {
                incentive = (cumulativeMTD - appliedTarget) * 0.005;
            }

            syncRecords.push({
                agent_username: username,
                record_date: dateStr,
                daily_disbursement: dailyAmount,
                total_revenue_mtd: cumulativeMTD,
                earned_incentive: incentive,
                applied_target: appliedTarget // Lock this snapshot
            });
        }

        // 5. Secure Upsert
        const { error: upsertError } = await supabase
            .from('agent_incentives')
            .upsert(syncRecords, { onConflict: 'agent_username,record_date' });

        if (upsertError) throw upsertError;

        console.log(`Sync completed for ${username}: ${syncRecords.length} days updated.`);
        return true;
    } catch (err) {
        console.error('Error in syncDailyIncentives:', err.message);
        return false;
    }
};  
