/**
 * IXmlAttribute is just the standard Attr
 */
export type IXmlAttribute = Attr;
/**
 * Just a wrapper for an XML Element object.
 * It facilitates handling of XML elements by OSMD
 */
export declare class IXmlElement {
    name: string;
    private attrs;
    private elem;
    private valueOfElement;
    private valueKnown;
    private hasAttributesOfElement;
    private firstAttributeOfElement;
    private attributeFieldsKnown;
    private hasElementsOfElement;
    private hasElementsKnown;
    private childElements;
    private childNames;
    private childLookups;
    /**
     * Wraps 'elem' Element in a IXmlElement
     * @param elem
     */
    constructor(elem: Element, knownName?: string);
    /** The text of the element if it only contains one text node, otherwise "". */
    get value(): string;
    set value(value: string);
    /** Whether the element has attributes. */
    get hasAttributes(): boolean;
    set hasAttributes(value: boolean);
    /** The first attribute of the element, undefined if it has none. */
    get firstAttribute(): IXmlAttribute;
    set firstAttribute(value: IXmlAttribute);
    /** Whether the element has child nodes (of any kind, e.g. also text). */
    get hasElements(): boolean;
    set hasElements(value: boolean);
    /** Reads hasAttributes and firstAttribute from the element, if not done yet. */
    private readAttributeFields;
    /**
     * Get the attribute with the given name
     * @param attributeName
     * @returns {Attr}
     */
    attribute(attributeName: string): IXmlAttribute;
    /**
     * Get all attributes
     * @returns {IXmlAttribute[]}
     */
    attributes(): IXmlAttribute[];
    /**
     * Get the first child element with the given node name
     * @param elementName
     * @returns {IXmlElement}
     */
    element(elementName: string): IXmlElement;
    /**
     * Get the children with the given node name (if given, otherwise all child elements)
     * @param nodeName
     * @returns {IXmlElement[]}
     */
    elements(nodeName?: string): IXmlElement[];
    /**
     * Get the first child element with the given node name
     * with all the children of consequent child elements with the same node name.
     * for example two <notations> tags will be combined for better processing
     * @param elementName
     * @returns {IXmlElement}
     */
    combinedElement(elementName: string): IXmlElement;
    /**
     * The child elements of the element, for a wrapper that is looked up in repeatedly (e.g. a note, about 10 times when
     * reading a score): scanning this list with their names is much faster than walking the child elements in the DOM for
     * every lookup, especially for the many lookups of names that aren't there. Read at the second lookup (most wrappers are
     * looked up in once, which walks the DOM as before), and read again if the element has another last child element,
     * i.e. if child elements were appended, like combinedElement() appends to the first element with a name.
     * @returns the child elements (with their names in childNames), or undefined for a first lookup, which walks the DOM
     */
    private childList;
}
