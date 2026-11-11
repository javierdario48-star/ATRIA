-- Keep the social store server-only. Room metadata and independently accepted
-- members use the existing table so admission can cross server instances.
alter table public.atria_v5_social
  drop constraint atria_v5_social_key_check,
  add constraint atria_v5_social_key_check check (
    key ~ '^qa-v1:(user|friends|requests|outgoing|invites):qa_[0-9a-f]{30}$'
    or key ~ '^qa-v1:room:[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
    or key ~ '^atria-v5:room-member:[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}:qa_[0-9a-f]{30}$'
  );
