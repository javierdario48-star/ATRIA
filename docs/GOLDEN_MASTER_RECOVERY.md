# ATRIA 4.8.6 golden-master recovery

The 4.8.6 production deployment is treated as immutable input only. CI captures its byte-faithful index.html and task*.js assets, records SHA-256 hashes, and persists the snapshot under vendor/atria-4.8.6 on the QA branch. Production is never modified by this workflow.

Once the vendor snapshot exists, normal QA builds must prefer that local snapshot so source/test work no longer depends on Vercel availability.
