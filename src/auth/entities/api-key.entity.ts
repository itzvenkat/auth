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

    @Column({ nullable: true })
    userId: string;

    @ManyToOne(() => User, (user) => user.apiKeys, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column()
    name: string;

    @Column({ unique: true })
    @Exclude()
    keyHash: string;

    // First 8 chars of the key shown to user (e.g. "sk-itzve...")
    @Column()
    keyPrefix: string;

    @Column({ type: 'simple-array', nullable: true })
    scopes: string[];

    @Column({ nullable: true })
    lastUsedAt: Date;

    @Column({ nullable: true })
    expiresAt: Date;

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
