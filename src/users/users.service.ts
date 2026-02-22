import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) { }

  async findOneById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id }, relations: ['roles'] });
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email }, relations: ['roles'] });
  }

  async findAll(page = 1, limit = 20): Promise<{ data: User[]; total: number }> {
    const [data, total] = await this.usersRepository.findAndCount({
      relations: ['roles'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  async updateStatus(userId: string, status: UserStatus): Promise<User | null> {
    const user = await this.findOneById(userId);
    if (!user) throw new NotFoundException('User not found');
    await this.usersRepository.update(userId, { status });
    return this.findOneById(userId);
  }

  async assignRoles(userId: string, roles: import('../roles/role.entity').Role[]): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId }, relations: ['roles'] });
    if (!user) throw new NotFoundException('User not found');
    user.roles = roles;
    return this.usersRepository.save(user);
  }
}
