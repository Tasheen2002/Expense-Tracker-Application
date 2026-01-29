export interface Activatable {
  isActive: boolean;
  updatedAt: Date;
  activate(): void;
  deactivate(): void;
}

export const activatableMixin = {
  activate(this: Activatable): void {
    this.isActive = true;
    this.updatedAt = new Date();
  },
  deactivate(this: Activatable): void {
    this.isActive = false;
    this.updatedAt = new Date();
  },
};

export function createActivateMethod(
  setActive: (value: boolean) => void,
  setUpdatedAt: (date: Date) => void,
): () => void {
  return () => {
    setActive(true);
    setUpdatedAt(new Date());
  };
}

export function createDeactivateMethod(
  setActive: (value: boolean) => void,
  setUpdatedAt: (date: Date) => void,
): () => void {
  return () => {
    setActive(false);
    setUpdatedAt(new Date());
  };
}
