DROP TABLE IF EXISTS "public"."chat_history";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS chat_history_id_seq;

-- Table Definition
CREATE TABLE "public"."chat_history" (
    "id" int4 NOT NULL DEFAULT nextval('chat_history_id_seq'::regclass),
    "session_id" text NOT NULL,
    "message" jsonb NOT NULL,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id")
);

