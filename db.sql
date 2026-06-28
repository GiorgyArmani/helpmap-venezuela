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
  CONSTRAINT patients_pkey PRIMARY KEY (id),
  CONSTRAINT patients_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(location_id)
);