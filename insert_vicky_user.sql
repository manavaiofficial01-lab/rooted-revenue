-- SQL to insert the user record into the public.users table
-- Run this in your Supabase SQL Editor

INSERT INTO public.users (
    id, 
    username, 
    phone, 
    password, 
    created_at, 
    updated_at, 
    email, 
    profile_pic
) VALUES (
    '4f943ad6-5f53-43cc-a6c4-f8c7441343c4', 
    'Vicky', 
    '+919442011620', 
    'Vicky@1234', 
    '2026-01-25T16:08:48.003276+00:00', 
    '2026-01-25T16:21:59.798725+00:00', 
    'kmvignesh1406@gmail.com', 
    'https://firebasestorage.googleapis.com/v0/b/manavai-2adb5.firebasestorage.app/o/profile_pics%2FVicky_1769588860551?alt=media&token=e78a3131-916c-420b-949a-940f85321ca3'
)
ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    phone = EXCLUDED.phone,
    password = EXCLUDED.password,
    updated_at = EXCLUDED.updated_at,
    email = EXCLUDED.email,
    profile_pic = EXCLUDED.profile_pic;
