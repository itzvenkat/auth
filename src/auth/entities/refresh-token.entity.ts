import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    JoinColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', unique: true })
    tokenHash: string;

    @Column({ type: 'varchar' })
    userId: string;

    @ManyToOne(() => User, (user) => user.refreshTokens, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ type: 'varchar', nullable: true })
    userAgent: string | null;

    @Column({ type: 'varchar', nullable: true })
    ipAddress: string | null;

    @Column({ type: 'varchar', nullable: true })
    deviceId: string | null;

    @Column({ type: 'timestamp' })
    expiresAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    revokedAt: Date | null;

    @Column({ type: 'boolean', default: false })
    isRevoked: boolean;

    @CreateDateColumn()
    createdAt: Date;
}
