drop policy if exists "Model artifacts are publicly readable" on storage.objects;

create policy "Public can read the published model file"
on storage.objects for select
using (bucket_id = 'model-artifacts' and name = 'lightgbm-v1.json');