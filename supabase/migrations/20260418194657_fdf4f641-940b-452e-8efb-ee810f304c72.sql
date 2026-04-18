-- Public bucket to host the trained model artifact
insert into storage.buckets (id, name, public)
values ('model-artifacts', 'model-artifacts', true)
on conflict (id) do nothing;

-- Anyone can read model artifacts (they are not sensitive)
create policy "Model artifacts are publicly readable"
on storage.objects for select
using (bucket_id = 'model-artifacts');