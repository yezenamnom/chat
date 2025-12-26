# 💎 معايير جودة الكود المتقدمة
# Advanced Code Quality Standards

## 📋 نظرة عامة
هذا الدليل يغطي معايير جودة الكود الأكثر تقدماً لضمان كود نظيف، قابل للصيانة، وقوي.

---

## 🎯 المبادئ الأساسية

### 1. Clean Code Principles

#### الوضوح فوق الذكاء
```typescript
// ❌ ذكي لكن غير واضح
const r = (a: number[], f: (n: number) => boolean) => a.filter(f);

// ✅ واضح ومفهوم
function filterNumbers(
  numbers: number[], 
  predicate: (number: number) => boolean
): number[] {
  return numbers.filter(predicate);
}
```

#### أسماء ذات معنى
```typescript
// ❌ أسماء غير واضحة
const d = new Date();
const u = getUser();
const p = processData(d, u);

// ✅ أسماء واضحة
const currentDate = new Date();
const authenticatedUser = getUser();
const processedResult = processUserData(currentDate, authenticatedUser);
```

#### دوال صغيرة ومتخصصة
```typescript
// ❌ دالة كبيرة تفعل الكثير
function handleUser(user: User) {
  // 50+ سطر من الكود
  validate(user);
  save(user);
  sendEmail(user);
  log(user);
  updateCache(user);
  // ...
}

// ✅ دوال صغيرة ومتخصصة
function handleUser(user: User): void {
  validateUser(user);
  saveUser(user);
  notifyUser(user);
  logUserActivity(user);
  updateUserCache(user);
}

function validateUser(user: User): void {
  if (!user.email || !isValidEmail(user.email)) {
    throw new Error('Invalid user email');
  }
  // ...
}
```

---

## 🏗️ SOLID Principles

### 1. Single Responsibility Principle (SRP)
```typescript
// ❌ كلاس يفعل الكثير
class User {
  save(): void { /* ... */ }
  sendEmail(): void { /* ... */ }
  generateReport(): void { /* ... */ }
  validate(): void { /* ... */ }
}

// ✅ كلاس واحد = مسؤولية واحدة
class User {
  // فقط بيانات المستخدم
}

class UserRepository {
  save(user: User): void { /* ... */ }
}

class EmailService {
  sendToUser(user: User): void { /* ... */ }
}

class ReportGenerator {
  generateForUser(user: User): Report { /* ... */ }
}

class UserValidator {
  validate(user: User): ValidationResult { /* ... */ }
}
```

### 2. Open/Closed Principle (OCP)
```typescript
// ✅ مفتوح للامتداد، مغلق للتعديل
interface PaymentProcessor {
  process(amount: number): Promise<void>;
}

class CreditCardProcessor implements PaymentProcessor {
  async process(amount: number): Promise<void> {
    // معالجة بطاقة ائتمان
  }
}

class PayPalProcessor implements PaymentProcessor {
  async process(amount: number): Promise<void> {
    // معالجة PayPal
  }
}

// يمكن إضافة معالجات جديدة بدون تعديل الكود الموجود
class CryptoProcessor implements PaymentProcessor {
  async process(amount: number): Promise<void> {
    // معالجة العملات المشفرة
  }
}
```

### 3. Liskov Substitution Principle (LSP)
```typescript
// ✅ الكلاسات الفرعية قابلة للاستبدال
interface Database {
  connect(): Promise<void>;
  query(sql: string): Promise<any[]>;
}

class MySQLDatabase implements Database {
  async connect(): Promise<void> { /* ... */ }
  async query(sql: string): Promise<any[]> { /* ... */ }
}

class PostgreSQLDatabase implements Database {
  async connect(): Promise<void> { /* ... */ }
  async query(sql: string): Promise<any[]> { /* ... */ }
}

// يمكن استبدال أي implementation
function useDatabase(db: Database) {
  // يعمل مع أي implementation
}
```

### 4. Interface Segregation Principle (ISP)
```typescript
// ❌ واجهة كبيرة
interface Worker {
  work(): void;
  eat(): void;
  sleep(): void;
}

// ✅ واجهات صغيرة ومتخصصة
interface Workable {
  work(): void;
}

interface Eatable {
  eat(): void;
}

interface Sleepable {
  sleep(): void;
}

class Human implements Workable, Eatable, Sleepable {
  work(): void { /* ... */ }
  eat(): void { /* ... */ }
  sleep(): void { /* ... */ }
}

class Robot implements Workable {
  work(): void { /* ... */ }
  // لا يحتاج eat أو sleep
}
```

### 5. Dependency Inversion Principle (DIP)
```typescript
// ❌ اعتماد على التنفيذ المحدد
class UserService {
  private db = new MySQLDatabase(); // اعتماد مباشر
}

// ✅ اعتماد على التجريد
interface Database {
  query(sql: string): Promise<any[]>;
}

class UserService {
  constructor(private db: Database) {} // اعتماد على interface
}

// يمكن تمرير أي implementation
const userService = new UserService(new MySQLDatabase());
// أو
const userService = new UserService(new PostgreSQLDatabase());
```

---

## 🎨 Design Patterns

### 1. Repository Pattern
```typescript
interface UserRepository {
  findById(id: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  save(user: User): Promise<User>;
  delete(id: string): Promise<void>;
}

class DatabaseUserRepository implements UserRepository {
  constructor(private db: Database) {}
  
  async findById(id: string): Promise<User | null> {
    const result = await this.db.query('SELECT * FROM users WHERE id = ?', [id]);
    return result[0] ? this.mapToUser(result[0]) : null;
  }
  
  // ... باقي الطرق
  
  private mapToUser(row: any): User {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
    };
  }
}
```

### 2. Factory Pattern
```typescript
interface PaymentProcessor {
  process(amount: number): Promise<void>;
}

class PaymentProcessorFactory {
  static create(type: 'credit' | 'paypal' | 'crypto'): PaymentProcessor {
    switch (type) {
      case 'credit':
        return new CreditCardProcessor();
      case 'paypal':
        return new PayPalProcessor();
      case 'crypto':
        return new CryptoProcessor();
      default:
        throw new Error(`Unknown payment type: ${type}`);
    }
  }
}
```

### 3. Strategy Pattern
```typescript
interface SortingStrategy {
  sort<T>(items: T[]): T[];
}

class QuickSortStrategy implements SortingStrategy {
  sort<T>(items: T[]): T[] {
    // Quick sort implementation
    return items;
  }
}

class MergeSortStrategy implements SortingStrategy {
  sort<T>(items: T[]): T[] {
    // Merge sort implementation
    return items;
  }
}

class Sorter {
  constructor(private strategy: SortingStrategy) {}
  
  setStrategy(strategy: SortingStrategy): void {
    this.strategy = strategy;
  }
  
  sort<T>(items: T[]): T[] {
    return this.strategy.sort(items);
  }
}
```

### 4. Observer Pattern
```typescript
interface Observer {
  update(data: any): void;
}

class Subject {
  private observers: Observer[] = [];
  
  attach(observer: Observer): void {
    this.observers.push(observer);
  }
  
  detach(observer: Observer): void {
    this.observers = this.observers.filter(o => o !== observer);
  }
  
  notify(data: any): void {
    this.observers.forEach(observer => observer.update(data));
  }
}

class UserService extends Subject {
  async createUser(userData: UserData): Promise<User> {
    const user = await this.saveUser(userData);
    this.notify({ type: 'user_created', user });
    return user;
  }
}
```

---

## 🧪 Testing Standards

### 1. Unit Tests
```typescript
describe('UserService', () => {
  let userService: UserService;
  let mockRepository: jest.Mocked<UserRepository>;
  
  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      save: jest.fn(),
    } as any;
    
    userService = new UserService(mockRepository);
  });
  
  it('should find user by id', async () => {
    const mockUser: User = { id: '1', name: 'Test', email: 'test@test.com' };
    mockRepository.findById.mockResolvedValue(mockUser);
    
    const result = await userService.findById('1');
    
    expect(result).toEqual(mockUser);
    expect(mockRepository.findById).toHaveBeenCalledWith('1');
  });
  
  it('should throw error when user not found', async () => {
    mockRepository.findById.mockResolvedValue(null);
    
    await expect(userService.findById('1')).rejects.toThrow('User not found');
  });
});
```

### 2. Integration Tests
```typescript
describe('User API Integration', () => {
  let app: Express;
  
  beforeAll(async () => {
    app = createApp();
    await setupTestDatabase();
  });
  
  afterAll(async () => {
    await cleanupTestDatabase();
  });
  
  it('should create and retrieve user', async () => {
    const userData = { name: 'Test', email: 'test@test.com' };
    
    const createResponse = await request(app)
      .post('/api/users')
      .send(userData)
      .expect(201);
    
    const userId = createResponse.body.id;
    
    const getResponse = await request(app)
      .get(`/api/users/${userId}`)
      .expect(200);
    
    expect(getResponse.body).toMatchObject(userData);
  });
});
```

---

## 📝 Documentation Standards

### 1. JSDoc Comments
```typescript
/**
 * Calculates the total price including tax
 * 
 * @param price - The base price before tax
 * @param taxRate - The tax rate as a decimal (e.g., 0.1 for 10%)
 * @returns The total price including tax
 * 
 * @example
 * ```typescript
 * const total = calculateTotalPrice(100, 0.1); // Returns 110
 * ```
 * 
 * @throws {Error} If price is negative or taxRate is invalid
 */
function calculateTotalPrice(price: number, taxRate: number): number {
  if (price < 0) {
    throw new Error('Price cannot be negative');
  }
  if (taxRate < 0 || taxRate > 1) {
    throw new Error('Tax rate must be between 0 and 1');
  }
  return price * (1 + taxRate);
}
```

### 2. README Documentation
```markdown
# Project Name

## Description
Brief description of the project.

## Installation
\`\`\`bash
npm install
\`\`\`

## Usage
\`\`\`typescript
import { UserService } from './services/UserService';

const userService = new UserService();
const user = await userService.findById('123');
\`\`\`

## API Documentation
See [API.md](./docs/API.md)

## Testing
\`\`\`bash
npm test
\`\`\`
```

---

## 🔒 Security Standards

### 1. Input Validation
```typescript
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
});

function createUser(data: unknown): User {
  const validated = UserSchema.parse(data);
  // الآن data آمن للاستخدام
  return saveUser(validated);
}
```

### 2. Authentication & Authorization
```typescript
interface AuthContext {
  userId: string;
  roles: string[];
}

function requireAuth(context: AuthContext): void {
  if (!context.userId) {
    throw new Error('Unauthorized');
  }
}

function requireRole(context: AuthContext, role: string): void {
  requireAuth(context);
  if (!context.roles.includes(role)) {
    throw new Error('Forbidden');
  }
}
```

---

## ⚡ Performance Standards

### 1. Lazy Loading
```typescript
class DataLoader {
  private cache = new Map<string, Promise<any>>();
  
  async load(key: string): Promise<any> {
    if (!this.cache.has(key)) {
      this.cache.set(key, this.fetchData(key));
    }
    return this.cache.get(key)!;
  }
  
  private async fetchData(key: string): Promise<any> {
    // Load data
  }
}
```

### 2. Memoization
```typescript
function memoize<Args extends any[], Return>(
  fn: (...args: Args) => Return
): (...args: Args) => Return {
  const cache = new Map<string, Return>();
  
  return (...args: Args): Return => {
    const key = JSON.stringify(args);
    if (!cache.has(key)) {
      cache.set(key, fn(...args));
    }
    return cache.get(key)!;
  };
}

const expensiveCalculation = memoize((n: number) => {
  // Expensive calculation
  return n * n;
});
```

---

## 📊 Code Metrics

### معايير الجودة:
- **Cyclomatic Complexity**: < 10 لكل دالة
- **Code Coverage**: > 80%
- **Function Length**: < 50 سطر
- **File Length**: < 500 سطر
- **Nesting Depth**: < 4 مستويات

---

**آخر تحديث: ديسمبر 2024**





