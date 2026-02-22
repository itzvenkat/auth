import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToMany,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('roles')
export class Role {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    name: string; // 'admin' | 'user' | 'moderator'

    @Column({ nullable: true })
    description: string;

    @Column({ type: 'simple-array', nullable: true })
    permissions: string[]; // e.g. ['users:read', 'users:write']

    @Column({ default: false })
    isDefault: boolean; // auto-assigned to new users

    @ManyToMany(() => User, (user) => user.roles)
    users: User[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
