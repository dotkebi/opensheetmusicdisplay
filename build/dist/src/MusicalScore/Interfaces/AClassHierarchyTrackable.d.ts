/** A class, e.g. GraphicalMeasure, also an abstract one: its constructor, which instanceof compares objects with. */
export type ClassType<T = unknown> = abstract new (...args: any[]) => T;
export declare abstract class AClassHierarchyTrackable {
    /**
     * Returns whether this object is an instance of the class, e.g. isInstanceOfClass(GraphicalMeasure).
     * @param classOrName The class, or its name (e.g. GraphicalMeasure.name). A name is unreliable in minified builds:
     *   they rename the classes, and give different classes the same name, e.g. "a" to GraphicalMeasure and GraphicalNote.
     */
    isInstanceOfClass(classOrName: ClassType | string): boolean;
}
