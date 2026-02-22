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

    @Column({ type: 'varchar', unique: true })
    name: string; // 'superadmin' | 'admin' | 'moderator' | 'user'

    @Column({ type: 'varchar', nullable: true })
    description: string | null;

    @Column({ type: 'simple-array', nullable: true })
    permissions: string[] | null; // e.g. ['users:read', 'users:write']

    @Column({ type: 'boolean', default: false })
    isDefault: boolean; // auto-assigned to new users

    @ManyToMany(() => User, (user) => user.roles)
    users: User[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
