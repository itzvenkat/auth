import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    JoinColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';

export enum AuditAction {
    REGISTER = 'REGISTER',
    LOGIN = 'LOGIN',
    LOGIN_FAILED = 'LOGIN_FAILED',
    LOGOUT = 'LOGOUT',
    REFRESH_TOKEN = 'REFRESH_TOKEN',
    PASSWORD_CHANGE = 'PASSWORD_CHANGE',
    PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
    PASSWORD_RESET = 'PASSWORD_RESET',
    EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
    TWO_FACTOR_ENABLED = 'TWO_FACTOR_ENABLED',
    TWO_FACTOR_DISABLED = 'TWO_FACTOR_DISABLED',
    TWO_FACTOR_LOGIN = 'TWO_FACTOR_LOGIN',
    ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
    ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
    ACCOUNT_ACTIVATED = 'ACCOUNT_ACTIVATED',
    OAUTH_LOGIN = 'OAUTH_LOGIN',
    API_KEY_CREATED = 'API_KEY_CREATED',
    API_KEY_REVOKED = 'API_KEY_REVOKED',
    SESSION_REVOKED = 'SESSION_REVOKED',
    ALL_SESSIONS_REVOKED = 'ALL_SESSIONS_REVOKED',
}

@Entity('audit_logs')
export class AuditLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', nullable: true })
    userId: string | null;

    @ManyToOne(() => User, (user) => user.auditLogs, {
        onDelete: 'SET NULL',
        nullable: true,
    })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ type: 'enum', enum: AuditAction })
    action: AuditAction;

    @Column({ type: 'varchar', nullable: true })
    ipAddress: string | null;

    @Column({ type: 'varchar', nullable: true })
    userAgent: string | null;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any> | null;

    @Column({ type: 'boolean', default: true })
    success: boolean;

    @CreateDateColumn()
    createdAt: Date;
}
