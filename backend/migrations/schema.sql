create schema if not exists workspace;
create schema if not exists workspace_private;
create table if not exists workspace.projects (
 id uuid primary key, owner_id uuid not null,
 plan text not null check(plan in ('with','without')),
 details jsonb not null default '{}', services text[] not null default '{}',
 completed boolean not null default false, visits jsonb not null default '[]',
 status text not null default 'draft' check(status in ('draft','submitted','approved','changes_requested')),
 review_note text not null default '', revision integer not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists workspace_projects_owner on workspace.projects(owner_id,updated_at desc);
create table if not exists workspace.files (
 id uuid primary key, project_id uuid not null references workspace.projects(id) on delete cascade,
 owner_id uuid not null, kind text not null check(kind in ('photo','document')),
 name text not null, size integer not null check(size between 1 and 10485760),
 mime_type text not null, storage_path text not null default '', content bytea not null,
 created_at timestamptz not null default now()
);
create index if not exists workspace_files_project on workspace.files(project_id);
create table if not exists workspace.audit_events (
 id uuid primary key default gen_random_uuid(),actor_id uuid not null,project_id uuid references workspace.projects(id),
 action text not null,metadata jsonb not null default '{}',created_at timestamptz not null default now()
);
create table if not exists workspace.schema_versions(version text primary key,applied_at timestamptz not null default now());
