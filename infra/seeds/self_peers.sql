-- Phase B: self tenant's peer set (vendor-neutral; config, not source).
-- Domains must match raw_payload->>'domain' values present in self's signal
-- inflow so peer standings have data. Adjust the list to the real peer set.
update tenants
   set config = coalesce(config, '{}'::jsonb) || jsonb_build_object(
         'peers', jsonb_build_array(
           jsonb_build_object('domain','thehindu.com','name','The Hindu','tier','peer'),
           jsonb_build_object('domain','indianexpress.com','name','The Indian Express','tier','peer'),
           jsonb_build_object('domain','timesofindia.indiatimes.com','name','The Times of India','tier','peer'),
           jsonb_build_object('domain','hindustantimes.com','name','Hindustan Times','tier','peer'),
           jsonb_build_object('domain','ndtv.com','name','NDTV','tier','peer')
         )
       )
 where slug = 'self';
