-- Session-token revocation backstop (security audit, item 1). The signed
-- session cookie carries this value as `tv`; getAccount() compares it against
-- the row. Bumping it (password change, admin "log out all sessions") makes
-- every outstanding token for that user fail verification. Default 0 means all
-- existing rows match tokens minted after deploy, so applying this migration is
-- safe ahead of the code deploy.
alter table users add column if not exists token_version int not null default 0;
