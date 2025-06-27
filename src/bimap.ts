class BiMap<K, V> {
    private forward = new Map<K, V>();
    private backward = new Map<V, K>();

    constructor(initObj?: Record<string, any>) {
        if (initObj) {
            for (const [k, v] of Object.entries(initObj)) {
                this.set(k as unknown as K, v as unknown as V);
            }
        }
    }

    set(key: K, value: V): void {
        if (this.forward.has(key)) {
            const oldValue = this.forward.get(key)!;
            this.backward.delete(oldValue);
        }
        if (this.backward.has(value)) {
            const oldKey = this.backward.get(value)!;
            this.forward.delete(oldKey);
        }
        this.forward.set(key, value);
        this.backward.set(value, key);
    }

    get(key: K): V | undefined {
        return this.forward.get(key);
    }

    getKey(value: V): K | undefined {
        return this.backward.get(value);
    }

    delete(key: K): void {
        const value = this.forward.get(key);
        if (value !== undefined) {
            this.forward.delete(key);
            this.backward.delete(value);
        }
    }

    deleteValue(value: V): void {
        const key = this.backward.get(value);
        if (key !== undefined) {
            this.backward.delete(value);
            this.forward.delete(key);
        }
    }

    has(key: K): boolean {
        return this.forward.has(key);
    }

    hasValue(value: V): boolean {
        return this.backward.has(value);
    }

    clear(): void {
        this.forward.clear();
        this.backward.clear();
    }
}


const biMap = new BiMap<string, string>(JSON.parse('{"a":"good"}'));

export { biMap };