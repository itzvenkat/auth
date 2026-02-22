import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    UpdateDateColumn,
    JoinColumn,
    Unique,
} from 'typeorm';
import { User } from '../../users/user.entity';

@Entity('oauth_accounts')
@Unique(['provider', 'providerAccountId'])
export class OAuthAccount {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar' })
    userId: string;

    @ManyToOne(() => User, (user) => user.oauthAccounts, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ type: 'varchar' })
    provider: string; // 'google' | 'github'

    @Column({ type: 'varchar' })
    providerAccountId: string;

    @Column({ type: 'varchar', nullable: true })
    accessToken: string | null;

    @Column({ type: 'varchar', nullable: true })
    refreshToken: string | null;

    @Column({ type: 'timestamp', nullable: true })
    tokenExpiry: Date | null;

    @Column({ type: 'jsonb', nullable: true })
    profile: Record<string, any> | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
