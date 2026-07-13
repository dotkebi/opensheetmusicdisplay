import { OpenSheetMusicDisplay } from "../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
/**
 * This class collects useful methods to interact with test data.
 * During tests, XML and MXL documents are preprocessed by karma,
 * and this is some helper code to retrieve them.
 */
export declare class TestUtils {
    static getScore(name: string): Document;
    static getMXL(scoreName: string): string;
    static getDivElement(document: Document): HTMLElement;
    /**
     * Retrieve from a XML document the first element with name "score-partwise"
     * @param doc is the XML Document
     * @returns {Element}
     */
    static getPartWiseElement(doc: Document): Element;
    static createOpenSheetMusicDisplay(div: HTMLElement): OpenSheetMusicDisplay;
}
