export default Example;
declare function Example<T>(target?: T): Promise<T & typeof Example>;
declare module Example {
    function destroy(obj: any): void;
    function _malloc(size: number): number;
    function _free(ptr: number): void;
    const HEAP8: Int8Array;
    const HEAP16: Int16Array;
    const HEAP32: Int32Array;
    const HEAPU8: Uint8Array;
    const HEAPU16: Uint16Array;
    const HEAPU32: Uint32Array;
    const HEAPF32: Float32Array;
    const HEAPF64: Float64Array;
    class Example {
        static readonly StaticReadOnly: number;
        static StaticMethod(): void;
    }
    enum Fruit2 {
        'APPLE',
        'BANANA'
    }
    enum Fruit {
        'Apple',
        'Banana'
    }
    class PxGeometry {
        getType(): void;
    }
    class PxHeightFieldGeometry extends PxGeometry {
        isValid(): boolean;
    }
    class PxRigidActor {
    }
    class PxRigidStatic extends PxRigidActor {
    }
}