import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1772376918232 implements MigrationInterface {
    name = 'InitialSchema1772376918232'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "posts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "content" text NOT NULL, "attachments" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "cursorId" BIGSERIAL NOT NULL, CONSTRAINT "UQ_0565203d5c53e1acc58d1b9880a" UNIQUE ("cursorId"), CONSTRAINT "PK_2829ac61eff60fcec60d7274b9e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0565203d5c53e1acc58d1b9880" ON "posts" ("cursorId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_0565203d5c53e1acc58d1b9880"`);
        await queryRunner.query(`DROP TABLE "posts"`);
    }

}
