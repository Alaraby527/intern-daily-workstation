(function installPolyfills() {
  if (typeof window === 'undefined') return;

  const w = window as any;

  if (typeof w.crypto === 'undefined') {
    w.crypto = {};
  }

  if (typeof w.crypto.randomUUID !== 'function') {
    let _uuidCounter = 0;
    w.crypto.randomUUID = function randomUUID(): string {
      _uuidCounter += 1;
      const rand = function (n: number): string {
        let s = '';
        let arr: Uint8Array;
        if (w.crypto && w.crypto.getRandomValues) {
          arr = new Uint8Array(n);
          w.crypto.getRandomValues(arr);
        } else {
          arr = new Uint8Array(n);
          for (let i = 0; i < n; i += 1) arr[i] = Math.floor(Math.random() * 256);
        }
        for (let i = 0; i < n; i += 1) s += arr[i].toString(16).padStart(2, '0');
        return s;
      };
      const ts = Date.now().toString(16).padStart(12, '0');
      const cnt = (_uuidCounter % 65536).toString(16).padStart(4, '0');
      return (
        rand(4) + '-' + rand(2) + '-4' + rand(2).slice(1) + '-' + rand(2) + '-' + ts + cnt
      ).toLowerCase();
    };
  }

  if (typeof Object.entries !== 'function') {
    Object.entries = function (obj: any): [string, any][] {
      return Object.keys(obj).map(function (k) {
        return [k, obj[k]];
      });
    };
  }

  if (typeof Object.values !== 'function') {
    Object.values = function (obj: any): any[] {
      return Object.keys(obj).map(function (k) {
        return obj[k];
      });
    };
  }

  if (typeof Object.fromEntries !== 'function') {
    Object.fromEntries = function (entries: any): Record<string, any> {
      const result: Record<string, any> = {};
      const arr = Array.isArray(entries) ? entries : Array.prototype.slice.call(entries);
      for (let i = 0; i < arr.length; i += 1) {
        const pair = arr[i];
        if (pair && pair.length >= 2) result[pair[0]] = pair[1];
      }
      return result;
    };
  }
})();

export {};
