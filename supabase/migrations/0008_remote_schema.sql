drop policy "Admins can read all profiles" on "public"."profiles";

drop policy "Admins can update all profiles" on "public"."profiles";

drop policy "Users can insert own profile" on "public"."profiles";

drop policy "Users can read own profile" on "public"."profiles";

drop policy "Users can update own profile" on "public"."profiles";

alter table "public"."profiles" disable row level security;


