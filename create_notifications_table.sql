-- Create the notifications table with tracking statuses
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4 (),
  created_at timestamp with time zone NULL DEFAULT now(),
  message text NOT NULL,
  target_username text NULL,
  is_global boolean NULL DEFAULT false,
  type text NULL DEFAULT 'info'::text,
  created_by text NULL DEFAULT 'Admin'::text,
  
  -- Tracking statuses
  status text NULL DEFAULT 'sent'::text, -- 'sent', 'received', 'seen'
  sent_at timestamp with time zone NULL DEFAULT now(),
  received_at timestamp with time zone NULL,
  seen_at timestamp with time zone NULL,
  
  CONSTRAINT notifications_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Optional: If you want to track reads per user for global notifications
CREATE TABLE IF NOT EXISTS public.notification_reads (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4 (),
  notification_id uuid REFERENCES public.notifications(id) ON DELETE CASCADE,
  username text NOT NULL,
  read_at timestamp with time zone DEFAULT now(),
  UNIQUE(notification_id, username),
  CONSTRAINT notification_reads_pkey PRIMARY KEY (id)
);
