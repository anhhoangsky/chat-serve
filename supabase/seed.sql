-- Simple seed data for development
insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000001', 'demo1@example.com') on conflict do nothing;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000002', 'demo2@example.com') on conflict do nothing;
update public.profiles set username='demo1', display_name='Demo One' where id='00000000-0000-0000-0000-000000000001';
update public.profiles set username='demo2', display_name='Demo Two' where id='00000000-0000-0000-0000-000000000002';
