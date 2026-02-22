import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  LOCKED = 'locked',
  PENDING = 'pending',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  // type must be explicit on nullable fields — TypeScript emits 'Object'
  // for union types (string | null), which TypeORM cannot map to Postgres
  @Column({ type: 'varchar', nullable: true })
  name: string | null;

  @Column({ type: 'varchar', nullable: true })
  avatar: string | null;

  @Column({ type: 'varchar', nullable: true })
  @Exclude()
  password: string | null;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.PENDING })
  status: UserStatus;

  // ─── Email verification ─────────────────────────────────────────────────────

  @Column({ type: 'boolean', default: false })
  isEmailVerified: boolean;

  @Column({ type: 'varchar', nullable: true })
  @Exclude()
  emailVerificationToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  emailVerificationExpiry: Date | null;

  // ─── Password reset ─────────────────────────────────────────────────────────

  @Column({ type: 'varchar', nullable: true })
  @Exclude()
  passwordResetToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  passwordResetExpiry: Date | null;

  // ─── Two-factor authentication ──────────────────────────────────────────────

  @Column({ type: 'boolean', default: false })
  isTwoFactorEnabled: boolean;

  @Column({ type: 'varchar', nullable: true })
  @Exclude()
  twoFactorSecret: string | null;

  @Column({ type: 'jsonb', nullable: true })
  @Exclude()
  twoFactorBackupCodes: string[] | null;

  // ─── Brute force protection ─────────────────────────────────────────────────

  @Column({ type: 'int', default: 0 })
  loginAttempts: number;

  @Column({ type: 'timestamp', nullable: true })
  lockedUntil: Date | null;

  // ─── Tracking ───────────────────────────────────────────────────────────────

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  lastLoginIp: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ─── Relations — string-based to avoid circular imports ─────────────────────

  @ManyToMany('Role', 'users', { eager: false })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: any[];

  @OneToMany('RefreshToken', 'user', { cascade: true })
  refreshTokens: any[];

  @OneToMany('AuditLog', 'user', { cascade: true })
  auditLogs: any[];

  @OneToMany('ApiKey', 'user', { cascade: true })
  apiKeys: any[];

  @OneToMany('OAuthAccount', 'user', { cascade: true })
  oauthAccounts: any[];
}
