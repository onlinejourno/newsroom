-- Demo cohort (ADR 0055): jumbled, fictional Hindu-style names, roles,
-- bureaus; emails @onlinejourno.com. Generated deterministically (seed 1878).
delete from users where tenant_id=(select id from tenants where slug='self') and email like '%@thehindu.co.in' and role<>'admin';
delete from journalist_profiles where tenant_id=(select id from tenants where slug='self') and slug like 'td-%';

with t as (select id from tenants where slug='self'),
p as (
  insert into journalist_profiles (tenant_id,slug,name,bureau,region,beats,role,language)
  select id,'priscilla-g','Priscilla G','Chennai Bureau','Chennai','["National", "Politics"]'::jsonb,'Resident Editor','en' from t
  on conflict (tenant_id,slug) do update set name=excluded.name returning id,tenant_id
)
insert into users (tenant_id,email,display_name,role,status,bureau,profile_id,approved_at,beat_focus)
select p.tenant_id,'priscilla-g@onlinejourno.com','Priscilla G','editor','approved','Chennai Bureau',p.id,now(),
       array(select jsonb_array_elements_text('["National", "Politics"]'::jsonb))
from p on conflict (tenant_id,email) do nothing;

with t as (select id from tenants where slug='self'),
p as (
  insert into journalist_profiles (tenant_id,slug,name,bureau,region,beats,role,language)
  select id,'mithun-roy','Mithun Roy','Hyderabad Bureau','Hyderabad','["National", "International"]'::jsonb,'National Editor','en' from t
  on conflict (tenant_id,slug) do update set name=excluded.name returning id,tenant_id
)
insert into users (tenant_id,email,display_name,role,status,bureau,profile_id,approved_at,beat_focus)
select p.tenant_id,'mithun-roy@onlinejourno.com','Mithun Roy','editor','approved','Hyderabad Bureau',p.id,now(),
       array(select jsonb_array_elements_text('["National", "International"]'::jsonb))
from p on conflict (tenant_id,email) do nothing;

with t as (select id from tenants where slug='self'),
p as (
  insert into journalist_profiles (tenant_id,slug,name,bureau,region,beats,role,language)
  select id,'mayank-mohideen','Mayank Mohideen','Kolkata Bureau','Kolkata','["Politics", "Governance"]'::jsonb,'Bureau Chief','en' from t
  on conflict (tenant_id,slug) do update set name=excluded.name returning id,tenant_id
)
insert into users (tenant_id,email,display_name,role,status,bureau,profile_id,approved_at,beat_focus)
select p.tenant_id,'mayank-mohideen@onlinejourno.com','Mayank Mohideen','desk','approved','Kolkata Bureau',p.id,now(),
       array(select jsonb_array_elements_text('["Politics", "Governance"]'::jsonb))
from p on conflict (tenant_id,email) do nothing;

with t as (select id from tenants where slug='self'),
p as (
  insert into journalist_profiles (tenant_id,slug,name,bureau,region,beats,role,language)
  select id,'girish-c','Girish C','Hyderabad Bureau','Hyderabad','["Business", "Economy"]'::jsonb,'Bureau Chief','en' from t
  on conflict (tenant_id,slug) do update set name=excluded.name returning id,tenant_id
)
insert into users (tenant_id,email,display_name,role,status,bureau,profile_id,approved_at,beat_focus)
select p.tenant_id,'girish-c@onlinejourno.com','Girish C','desk','approved','Hyderabad Bureau',p.id,now(),
       array(select jsonb_array_elements_text('["Business", "Economy"]'::jsonb))
from p on conflict (tenant_id,email) do nothing;

with t as (select id from tenants where slug='self'),
p as (
  insert into journalist_profiles (tenant_id,slug,name,bureau,region,beats,role,language)
  select id,'achuth-venkatasubramanian','Achuth Venkatasubramanian','Mumbai Bureau','Mumbai','["National", "Cities"]'::jsonb,'News Editor','en' from t
  on conflict (tenant_id,slug) do update set name=excluded.name returning id,tenant_id
)
insert into users (tenant_id,email,display_name,role,status,bureau,profile_id,approved_at,beat_focus)
select p.tenant_id,'achuth-venkatasubramanian@onlinejourno.com','Achuth Venkatasubramanian','desk','approved','Mumbai Bureau',p.id,now(),
       array(select jsonb_array_elements_text('["National", "Cities"]'::jsonb))
from p on conflict (tenant_id,email) do nothing;

with t as (select id from tenants where slug='self'),
p as (
  insert into journalist_profiles (tenant_id,slug,name,bureau,region,beats,role,language)
  select id,'kannan-r','Kannan R','Hyderabad Bureau','Hyderabad','["Markets", "Business"]'::jsonb,'Digital Desk','en' from t
  on conflict (tenant_id,slug) do update set name=excluded.name returning id,tenant_id
)
insert into users (tenant_id,email,display_name,role,status,bureau,profile_id,approved_at,beat_focus)
select p.tenant_id,'kannan-r@onlinejourno.com','Kannan R','desk','approved','Hyderabad Bureau',p.id,now(),
       array(select jsonb_array_elements_text('["Markets", "Business"]'::jsonb))
from p on conflict (tenant_id,email) do nothing;

with t as (select id from tenants where slug='self'),
p as (
  insert into journalist_profiles (tenant_id,slug,name,bureau,region,beats,role,language)
  select id,'chinmay-d','Chinmay D','Hyderabad Bureau','Hyderabad','["Legal"]'::jsonb,'Principal Correspondent','en' from t
  on conflict (tenant_id,slug) do update set name=excluded.name returning id,tenant_id
)
insert into users (tenant_id,email,display_name,role,status,bureau,profile_id,approved_at,beat_focus)
select p.tenant_id,'chinmay-d@onlinejourno.com','Chinmay D','reporter','approved','Hyderabad Bureau',p.id,now(),
       array(select jsonb_array_elements_text('["Legal"]'::jsonb))
from p on conflict (tenant_id,email) do nothing;

with t as (select id from tenants where slug='self'),
p as (
  insert into journalist_profiles (tenant_id,slug,name,bureau,region,beats,role,language)
  select id,'sharad-tewary','Sharad Tewary','Delhi Bureau','Delhi','["Politics"]'::jsonb,'Special Correspondent','en' from t
  on conflict (tenant_id,slug) do update set name=excluded.name returning id,tenant_id
)
insert into users (tenant_id,email,display_name,role,status,bureau,profile_id,approved_at,beat_focus)
select p.tenant_id,'sharad-tewary@onlinejourno.com','Sharad Tewary','reporter','approved','Delhi Bureau',p.id,now(),
       array(select jsonb_array_elements_text('["Politics"]'::jsonb))
from p on conflict (tenant_id,email) do nothing;

with t as (select id from tenants where slug='self'),
p as (
  insert into journalist_profiles (tenant_id,slug,name,bureau,region,beats,role,language)
  select id,'shiv-s','Shiv S','Delhi Bureau','Delhi','["Cities", "States"]'::jsonb,'Correspondent','en' from t
  on conflict (tenant_id,slug) do update set name=excluded.name returning id,tenant_id
)
insert into users (tenant_id,email,display_name,role,status,bureau,profile_id,approved_at,beat_focus)
select p.tenant_id,'shiv-s@onlinejourno.com','Shiv S','reporter','approved','Delhi Bureau',p.id,now(),
       array(select jsonb_array_elements_text('["Cities", "States"]'::jsonb))
from p on conflict (tenant_id,email) do nothing;

with t as (select id from tenants where slug='self'),
p as (
  insert into journalist_profiles (tenant_id,slug,name,bureau,region,beats,role,language)
  select id,'hariharan-r','Hariharan R','Delhi Bureau','Delhi','["Sport"]'::jsonb,'Correspondent','en' from t
  on conflict (tenant_id,slug) do update set name=excluded.name returning id,tenant_id
)
insert into users (tenant_id,email,display_name,role,status,bureau,profile_id,approved_at,beat_focus)
select p.tenant_id,'hariharan-r@onlinejourno.com','Hariharan R','reporter','approved','Delhi Bureau',p.id,now(),
       array(select jsonb_array_elements_text('["Sport"]'::jsonb))
from p on conflict (tenant_id,email) do nothing;

with t as (select id from tenants where slug='self'),
p as (
  insert into journalist_profiles (tenant_id,slug,name,bureau,region,beats,role,language)
  select id,'sharad-k','Sharad K','Delhi Bureau','Delhi','["Environment", "Science"]'::jsonb,'Correspondent','en' from t
  on conflict (tenant_id,slug) do update set name=excluded.name returning id,tenant_id
)
insert into users (tenant_id,email,display_name,role,status,bureau,profile_id,approved_at,beat_focus)
select p.tenant_id,'sharad-k@onlinejourno.com','Sharad K','reporter','approved','Delhi Bureau',p.id,now(),
       array(select jsonb_array_elements_text('["Environment", "Science"]'::jsonb))
from p on conflict (tenant_id,email) do nothing;

with t as (select id from tenants where slug='self'),
p as (
  insert into journalist_profiles (tenant_id,slug,name,bureau,region,beats,role,language)
  select id,'vinaya-chatterjee','Vinaya Chatterjee','Chennai Bureau','Chennai','["Health"]'::jsonb,'Correspondent','en' from t
  on conflict (tenant_id,slug) do update set name=excluded.name returning id,tenant_id
)
insert into users (tenant_id,email,display_name,role,status,bureau,profile_id,approved_at,beat_focus)
select p.tenant_id,'vinaya-chatterjee@onlinejourno.com','Vinaya Chatterjee','reporter','approved','Chennai Bureau',p.id,now(),
       array(select jsonb_array_elements_text('["Health"]'::jsonb))
from p on conflict (tenant_id,email) do nothing;

with t as (select id from tenants where slug='self'),
p as (
  insert into journalist_profiles (tenant_id,slug,name,bureau,region,beats,role,language)
  select id,'shonali-h','Shonali H','Thiruvananthapuram Bureau','Thiruvananthapuram','["Education"]'::jsonb,'Correspondent','en' from t
  on conflict (tenant_id,slug) do update set name=excluded.name returning id,tenant_id
)
insert into users (tenant_id,email,display_name,role,status,bureau,profile_id,approved_at,beat_focus)
select p.tenant_id,'shonali-h@onlinejourno.com','Shonali H','reporter','approved','Thiruvananthapuram Bureau',p.id,now(),
       array(select jsonb_array_elements_text('["Education"]'::jsonb))
from p on conflict (tenant_id,email) do nothing;

with t as (select id from tenants where slug='self'),
p as (
  insert into journalist_profiles (tenant_id,slug,name,bureau,region,beats,role,language)
  select id,'sudhi-vinay','Sudhi Vinay','Chennai Bureau','Chennai','["Agri-Business", "Business"]'::jsonb,'Correspondent','en' from t
  on conflict (tenant_id,slug) do update set name=excluded.name returning id,tenant_id
)
insert into users (tenant_id,email,display_name,role,status,bureau,profile_id,approved_at,beat_focus)
select p.tenant_id,'sudhi-vinay@onlinejourno.com','Sudhi Vinay','reporter','approved','Chennai Bureau',p.id,now(),
       array(select jsonb_array_elements_text('["Agri-Business", "Business"]'::jsonb))
from p on conflict (tenant_id,email) do nothing;

with t as (select id from tenants where slug='self'),
p as (
  insert into journalist_profiles (tenant_id,slug,name,bureau,region,beats,role,language)
  select id,'shubhomoy-k','Shubhomoy K','Chennai Bureau','Chennai','["Entertainment"]'::jsonb,'Correspondent','en' from t
  on conflict (tenant_id,slug) do update set name=excluded.name returning id,tenant_id
)
insert into users (tenant_id,email,display_name,role,status,bureau,profile_id,approved_at,beat_focus)
select p.tenant_id,'shubhomoy-k@onlinejourno.com','Shubhomoy K','reporter','approved','Chennai Bureau',p.id,now(),
       array(select jsonb_array_elements_text('["Entertainment"]'::jsonb))
from p on conflict (tenant_id,email) do nothing;

with t as (select id from tenants where slug='self'),
p as (
  insert into journalist_profiles (tenant_id,slug,name,bureau,region,beats,role,language)
  select id,'lakshman-g','Lakshman G','Chennai Bureau','Chennai','["Technology", "Science"]'::jsonb,'Correspondent','en' from t
  on conflict (tenant_id,slug) do update set name=excluded.name returning id,tenant_id
)
insert into users (tenant_id,email,display_name,role,status,bureau,profile_id,approved_at,beat_focus)
select p.tenant_id,'lakshman-g@onlinejourno.com','Lakshman G','reporter','approved','Chennai Bureau',p.id,now(),
       array(select jsonb_array_elements_text('["Technology", "Science"]'::jsonb))
from p on conflict (tenant_id,email) do nothing;

with t as (select id from tenants where slug='self'),
p as (
  insert into journalist_profiles (tenant_id,slug,name,bureau,region,beats,role,language)
  select id,'satheesh-c','Satheesh C','Bengaluru Bureau','Bengaluru','["Markets", "Economy"]'::jsonb,'Correspondent','en' from t
  on conflict (tenant_id,slug) do update set name=excluded.name returning id,tenant_id
)
insert into users (tenant_id,email,display_name,role,status,bureau,profile_id,approved_at,beat_focus)
select p.tenant_id,'satheesh-c@onlinejourno.com','Satheesh C','reporter','approved','Bengaluru Bureau',p.id,now(),
       array(select jsonb_array_elements_text('["Markets", "Economy"]'::jsonb))
from p on conflict (tenant_id,email) do nothing;

with t as (select id from tenants where slug='self'),
p as (
  insert into journalist_profiles (tenant_id,slug,name,bureau,region,beats,role,language)
  select id,'abdul-phukan','Abdul Phukan','Mumbai Bureau','Mumbai','["Data"]'::jsonb,'Data Journalist','en' from t
  on conflict (tenant_id,slug) do update set name=excluded.name returning id,tenant_id
)
insert into users (tenant_id,email,display_name,role,status,bureau,profile_id,approved_at,beat_focus)
select p.tenant_id,'abdul-phukan@onlinejourno.com','Abdul Phukan','reporter','approved','Mumbai Bureau',p.id,now(),
       array(select jsonb_array_elements_text('["Data"]'::jsonb))
from p on conflict (tenant_id,email) do nothing;

with t as (select id from tenants where slug='self'),
p as (
  insert into journalist_profiles (tenant_id,slug,name,bureau,region,beats,role,language)
  select id,'julie-gaikwad','Julie Gaikwad','Coimbatore Bureau','Coimbatore','["Investigations", "National"]'::jsonb,'Correspondent','en' from t
  on conflict (tenant_id,slug) do update set name=excluded.name returning id,tenant_id
)
insert into users (tenant_id,email,display_name,role,status,bureau,profile_id,approved_at,beat_focus)
select p.tenant_id,'julie-gaikwad@onlinejourno.com','Julie Gaikwad','reporter','approved','Coimbatore Bureau',p.id,now(),
       array(select jsonb_array_elements_text('["Investigations", "National"]'::jsonb))
from p on conflict (tenant_id,email) do nothing;

with t as (select id from tenants where slug='self'),
p as (
  insert into journalist_profiles (tenant_id,slug,name,bureau,region,beats,role,language)
  select id,'roshni-k','Roshni K','Hyderabad Bureau','Hyderabad','["International"]'::jsonb,'Correspondent','en' from t
  on conflict (tenant_id,slug) do update set name=excluded.name returning id,tenant_id
)
insert into users (tenant_id,email,display_name,role,status,bureau,profile_id,approved_at,beat_focus)
select p.tenant_id,'roshni-k@onlinejourno.com','Roshni K','reporter','approved','Hyderabad Bureau',p.id,now(),
       array(select jsonb_array_elements_text('["International"]'::jsonb))
from p on conflict (tenant_id,email) do nothing;
