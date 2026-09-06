-- =============================================================================
-- DATA MIGRATION — export from OLD project -> import into NEW project
-- =============================================================================
-- OLD project: qgcemdmaxfcupconpqad  (Lovable Cloud)
-- NEW project: lfglegapqrsaxfypkrwd  (your external Supabase)
--
-- STEP A: run EVERYTHING below in the OLD project's SQL Editor.
-- STEP B: copy the query output (the INSERT statements).
-- STEP C: first run supabase/consolidated-schema.sql in the NEW project.
-- STEP D: then paste the copied INSERT statements into the NEW project's editor.
--
-- We use quote_literal(...) so text[], jsonb, timestamps and UUIDs are escaped
-- safely. Parent tables are exported before child tables.
-- =============================================================================

\echo '----- club_events -----'
SELECT 'INSERT INTO club_events (id,title,description,short_description,additional_info,poster_url,event_date,start_time,end_time,venue,max_participants,registration_deadline,status,form_config,form_version,created_at,updated_at) VALUES ('
  || quote_literal(id::text) || ','
  || coalesce(quote_literal(title),'NULL') || ','
  || coalesce(quote_literal(description),'NULL') || ','
  || coalesce(quote_literal(short_description),'NULL') || ','
  || coalesce(quote_literal(additional_info),'NULL') || ','
  || coalesce(quote_literal(poster_url),'NULL') || ','
  || coalesce(quote_literal(event_date::text),'NULL') || ','
  || coalesce(quote_literal(start_time::text),'NULL') || ','
  || coalesce(quote_literal(end_time::text),'NULL') || ','
  || coalesce(quote_literal(venue),'NULL') || ','
  || coalesce(quote_literal(max_participants::text),'NULL') || ','
  || coalesce(quote_literal(registration_deadline::text),'NULL') || ','
  || coalesce(quote_literal(status::text),'NULL') || ','
  || coalesce(quote_literal(form_config::text) || '::jsonb','NULL') || ','
  || coalesce(quote_literal(form_version::text),'NULL') || ','
  || coalesce(quote_literal(created_at::text),'NULL') || ','
  || coalesce(quote_literal(updated_at::text),'NULL')
  || ');'
FROM public.club_events;

\echo '----- event_requests -----'
SELECT 'INSERT INTO event_requests (id,reference,requester_name,email,phone,requester_type,organization,event_name,event_type,event_date,start_time,end_time,venue,expected_attendees,requested_services,other_service,event_description,additional_requirements,status,rejection_reason,created_at,updated_at) VALUES ('
  || quote_literal(id::text) || ','
  || coalesce(quote_literal(reference),'NULL') || ','
  || coalesce(quote_literal(requester_name),'NULL') || ','
  || coalesce(quote_literal(email),'NULL') || ','
  || coalesce(quote_literal(phone),'NULL') || ','
  || coalesce(quote_literal(requester_type),'NULL') || ','
  || coalesce(quote_literal(organization),'NULL') || ','
  || coalesce(quote_literal(event_name),'NULL') || ','
  || coalesce(quote_literal(event_type),'NULL') || ','
  || coalesce(quote_literal(event_date::text),'NULL') || ','
  || coalesce(quote_literal(start_time::text),'NULL') || ','
  || coalesce(quote_literal(end_time::text),'NULL') || ','
  || coalesce(quote_literal(venue),'NULL') || ','
  || coalesce(quote_literal(expected_attendees::text),'NULL') || ','
  || coalesce(quote_literal(requested_services::text) || '::text[]','NULL') || ','
  || coalesce(quote_literal(other_service),'NULL') || ','
  || coalesce(quote_literal(event_description),'NULL') || ','
  || coalesce(quote_literal(additional_requirements),'NULL') || ','
  || coalesce(quote_literal(status::text),'NULL') || ','
  || coalesce(quote_literal(rejection_reason),'NULL') || ','
  || coalesce(quote_literal(created_at::text),'NULL') || ','
  || coalesce(quote_literal(updated_at::text),'NULL')
  || ');'
FROM public.event_requests;

\echo '----- event_registrations -----'
SELECT 'INSERT INTO event_registrations (id,event_id,full_name,college_id,email,phone,department,year_of_study,additional_info,responses,form_version,form_snapshot,created_at) VALUES ('
  || quote_literal(id::text) || ','
  || quote_literal(event_id::text) || ','
  || coalesce(quote_literal(full_name),'NULL') || ','
  || coalesce(quote_literal(college_id),'NULL') || ','
  || coalesce(quote_literal(email),'NULL') || ','
  || coalesce(quote_literal(phone),'NULL') || ','
  || coalesce(quote_literal(department),'NULL') || ','
  || coalesce(quote_literal(year_of_study),'NULL') || ','
  || coalesce(quote_literal(additional_info),'NULL') || ','
  || coalesce(quote_literal(responses::text) || '::jsonb','NULL') || ','
  || coalesce(quote_literal(form_version::text),'NULL') || ','
  || coalesce(quote_literal(form_snapshot::text) || '::jsonb','NULL') || ','
  || coalesce(quote_literal(created_at::text),'NULL')
  || ');'
FROM public.event_registrations;

\echo '----- team_people (leads first) -----'
SELECT 'INSERT INTO team_people (id,kind,name,role,team,rank,lead_id,bio,skills,display_order,published,created_at,updated_at) VALUES ('
  || quote_literal(id::text) || ','
  || quote_literal(kind::text) || ','
  || quote_literal(name::text) || ','
  || quote_literal(role::text) || ','
  || coalesce(quote_literal(team),'NULL') || ','
  || coalesce(quote_literal(rank),'NULL') || ','
  || 'NULL,'
  || coalesce(quote_literal(bio),'NULL') || ','
  || coalesce(quote_literal(skills::text) || '::text[]','NULL') || ','
  || quote_literal(display_order::text) || ','
  || quote_literal(published::text) || ','
  || quote_literal(created_at::text) || ','
  || quote_literal(updated_at::text)
  || ');'
FROM public.team_people WHERE kind = 'lead'
ORDER BY display_order;

\echo '----- team_people (members second) -----'
SELECT 'INSERT INTO team_people (id,kind,name,role,team,rank,lead_id,bio,skills,display_order,published,created_at,updated_at) VALUES ('
  || quote_literal(id::text) || ','
  || quote_literal(kind::text) || ','
  || quote_literal(name::text) || ','
  || quote_literal(role::text) || ','
  || coalesce(quote_literal(team),'NULL') || ','
  || coalesce(quote_literal(rank),'NULL') || ','
  || coalesce(quote_literal(lead_id::text),'NULL') || ','
  || coalesce(quote_literal(bio),'NULL') || ','
  || coalesce(quote_literal(skills::text) || '::text[]','NULL') || ','
  || quote_literal(display_order::text) || ','
  || quote_literal(published::text) || ','
  || quote_literal(created_at::text) || ','
  || quote_literal(updated_at::text)
  || ');'
FROM public.team_people WHERE kind = 'member'
ORDER BY display_order;

\echo '----- user_roles -----'
SELECT 'INSERT INTO user_roles (id,user_id,role,created_at) VALUES ('
  || quote_literal(id::text) || ','
  || quote_literal(user_id::text) || ','
  || quote_literal(role::text) || ','
  || quote_literal(created_at::text)
  || ');'
FROM public.user_roles;
