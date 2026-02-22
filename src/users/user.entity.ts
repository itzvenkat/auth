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

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  name: string | null;

  @Column({ nullable: true })
  avatar: string | null;

  @Column({ nullable: true })
  @Exclude()
  password: string | null;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.PENDING })
  status: UserStatus;

  // Email verification
  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ nullable: true })
  @Exclude()
  emailVerificationToken: string | null;

  @Column({ nullable: true })
  emailVerificationExpiry: Date | null;

  // Password reset
  @Column({ nullable: true })
  @Exclude()
  passwordResetToken: string | null;

  @Column({ nullable: true })
  passwordResetExpiry: Date | null;

  // Two-factor authentication
  @Column({ default: false })
  isTwoFactorEnabled: boolean;

  @Column({ nullable: true })
  @Exclude()
  twoFactorSecret: string | null;

  @Column({ type: 'jsonb', nullable: true })
  @Exclude()
  twoFactorBackupCodes: string[] | null;

  // Brute force protection
  @Column({ default: 0 })
  loginAttempts: number;

  @Column({ nullable: true })
  lockedUntil: Date | null;

  // Tracking
  @Column({ nullable: true })
  lastLoginAt: Date | null;

  @Column({ nullable: true })
  lastLoginIp: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations — string-based to avoid circular imports
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
