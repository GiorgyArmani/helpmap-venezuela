-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.locations (
  location_id text NOT NULL,
  canonical_name text NOT NULL,
  type USER-DEFINED NOT NULL DEFAULT 'hospital'::location_type,
  municipality text,
  state USER-DEFINED NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  contact_phone text,
  contact_whatsapp text,
  aliases ARRAY NOT NULL DEFAULT '{}'::text[],
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT locations_pkey PRIMARY KEY (location_id)
);
CREATE TABLE public.patients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  person_key text NOT NULL UNIQUE,
  apellidos text NOT NULL,
  nombres text NOT NULL,
  ci text,
  is_minor boolean NOT NULL DEFAULT false,
  edad integer,
  sexo text CHECK (sexo = ANY (ARRAY['M'::text, 'F'::text])),
  location_id text NOT NULL,
  servicio text,
  estatus USER-DEFINED NOT NULL,
  foto_url text,
  verified boolean NOT NULL DEFAULT false,
  procedencia text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  data_updated_at timestamp with time zone,
  CONSTRAINT patients_pkey PRIMARY KEY (id),
  CONSTRAINT patients_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(location_id)
);
CREATE TABLE public.admin_users (
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'admin'::text CHECK (role = ANY (ARRAY['admin'::text, 'verifier'::text, 'volunteer'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT admin_users_pkey PRIMARY KEY (user_id),
  CONSTRAINT admin_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.donations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  social_url text,
  donate_url text,
  donate_info text,
  sort integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT donations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.contributions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  foto_url text,
  descripcion text,
  contacto text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  CONSTRAINT contributions_pkey PRIMARY KEY (id),
  CONSTRAINT contributions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT contributions_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id)
);
CREATE TABLE public.app_settings (
  id integer NOT NULL DEFAULT 1 CHECK (id = 1),
  maintenance boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT app_settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.rescatados (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  apellidos text NOT NULL DEFAULT ''::text,
  nombres text NOT NULL DEFAULT ''::text,
  ci text,
  is_minor boolean NOT NULL DEFAULT false,
  edad integer,
  sexo text CHECK (sexo = ANY (ARRAY['M'::text, 'F'::text])),
  foto_url text,
  procedencia text,
  contacto text,
  rescue_site text,
  notas text,
  verified boolean NOT NULL DEFAULT false,
  promoted boolean NOT NULL DEFAULT false,
  patient_id uuid,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rescatados_pkey PRIMARY KEY (id)
);
CREATE TABLE public.volunteer_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre text NOT NULL DEFAULT ''::text,
  email text NOT NULL,
  perfil text,
  fuentes text,
  telefono text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  reviewed_at timestamp with time zone,
  reviewed_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid,
  CONSTRAINT volunteer_requests_pkey PRIMARY KEY (id)
);
CREATE TABLE public.telegram_pending_uploads (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  telegram_update_id bigint UNIQUE,
  chat_id bigint NOT NULL,
  message_id bigint NOT NULL,
  telegram_file_id text NOT NULL,
  assigned_filename text NOT NULL,
  photo_width integer,
  photo_height integer,
  low_res boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending'::text,
  hospital_reportado text,
  file0_spreadsheet_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone,
  CONSTRAINT telegram_pending_uploads_pkey PRIMARY KEY (id)
);
CREATE TABLE public.telegram_authorized_senders (
  chat_id bigint NOT NULL,
  nombre_contacto text,
  hospital_asociado text,
  active boolean NOT NULL DEFAULT true,
  added_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT telegram_authorized_senders_pkey PRIMARY KEY (chat_id)
);
CREATE TABLE public.audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  actor_id uuid,
  actor_email text,
  actor_role text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  summary text,
  meta jsonb,
  CONSTRAINT audit_log_pkey PRIMARY KEY (id)
);
CREATE TABLE public.missing_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  apellidos text NOT NULL DEFAULT ''::text,
  nombres text NOT NULL DEFAULT ''::text,
  ci text,
  edad integer,
  zona text,
  descripcion text,
  reporter_name text,
  reporter_contact text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'reviewed'::text, 'closed'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  CONSTRAINT missing_reports_pkey PRIMARY KEY (id),
  CONSTRAINT missing_reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id)
);
CREATE TABLE public.refugios (
  location_id text NOT NULL,
  recibe ARRAY NOT NULL DEFAULT '{}'::text[],
  necesita text,
  horario text,
  responsable text,
  fuente text,
  address text,
  external_id text UNIQUE,
  es_animal boolean NOT NULL DEFAULT false,
  last_confirmed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT refugios_pkey PRIMARY KEY (location_id),
  CONSTRAINT refugios_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(location_id)
);