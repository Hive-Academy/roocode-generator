import 'reflect-metadata';

declare global {
  namespace Reflect {
    /**
     * Defines metadata for a key on a target object
     */
    function defineMetadata(metadataKey: string, metadataValue: any, target: object): void;

    /**
     * Gets metadata value for a key from a target object
     */
    function getMetadata(metadataKey: string, target: object): any;

    /**
     * Checks if metadata exists for a key on a target object
     */
    function hasMetadata(metadataKey: string, target: object): boolean;
  }
}
