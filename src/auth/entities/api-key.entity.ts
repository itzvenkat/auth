import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    UpdateDateColumn,
    JoinColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { User } from '../../users/user.entity';

@Entity('api_keys')
export class ApiKey {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', nullable: true })
    userId: string | null;

    @ManyToOne(() => User, (user) => user.apiKeys, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ type: 'varchar' })
    name: string;

    @Column({ type: 'varchar', unique: true })
    @Exclude()
    keyHash: string;

    // First 8 chars of the key shown to user (e.g. "sk-itzve...")
    @Column({ type: 'varchar' })
    keyPrefix: string;

    @Column({ type: 'simple-array', nullable: true })
    scopes: string[] | null;

    @Column({ type: 'timestamp', nullable: true })
    lastUsedAt: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    expiresAt: Date | null;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
