import { IXmlElement } from "./Xml";
import JSZip from "jszip";
import log from "loglevel";

export class MXLFile {
    private blob: Blob;
    public zipFile: JSZip;
    public xmlText: string;
    /** Set after tryUnzip(). True if it could be unzipped successfully. */
    public unzipSuccessful: boolean = false;
    public constructor(blob: Blob) {
        this.blob = blob;
    }

    /** Try unzipping to see if this is a zip file.
     * This is a separate method so that we don't need to unzip twice to check whether it's a zip file.
     */
    public async tryUnzip(): Promise<boolean> {
        this.zipFile = new JSZip();
        try {
            this.unzipSuccessful = true;
            await this.zipFile.loadAsync(this.blob);
            return true;
        } catch (e) {
            this.unzipSuccessful = false;
            return false;
        }
    }

    public getXmlString(): Promise<string> {
        return MXLHelper.jszipToXMLstring(this.zipFile);
    }
}

/**
 * Some helper methods to handle MXL files.
 */
export class MXLHelper {
    /** Decode XML bytes without mistaking an UTF-8 BOM for UTF-16 content. */
    private static decodeXml(bytes: Uint8Array): string {
        const hasUtf8Bom: boolean = bytes.length >= 3
            && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
        if (hasUtf8Bom) {
            return new TextDecoder("utf-8").decode(bytes).replace(/^\uFEFF/, "");
        }

        const hasUtf16Bom: boolean = bytes.length >= 2
            && ((bytes[0] === 0xff && bytes[1] === 0xfe)
                || (bytes[0] === 0xfe && bytes[1] === 0xff));
        if (hasUtf16Bom) {
            return new TextDecoder("utf-16").decode(bytes);
        }

        const utf8Text: string = new TextDecoder("utf-8").decode(bytes);
        if (utf8Text.trimStart().startsWith("<")) {
            return utf8Text;
        }

        // Legacy MXL files can contain UTF-16 XML without a byte-order mark.
        return new TextDecoder("utf-16").decode(bytes);
    }

    /** Returns the documentElement of MXL data. */
    public static MXLtoIXmlElement(data: string): Promise<IXmlElement> {
        return this.MXLtoXMLstring(data)
        .then(
            (content: string) => {
                const parser: DOMParser = new DOMParser();
                const xml: Document = parser.parseFromString(content, "text/xml");
                const doc: IXmlElement = new IXmlElement(xml.documentElement);
                return Promise.resolve(doc);
            },
            (err: any) => {
                throw new Error("extractSheetFromMxl: " + err.message);
            }
        );
    }

    public static async jszipToXMLstring(zip: JSZip): Promise<string> {
        // asynchronously load zip file and process it - with Promises
        const containerBytes: Uint8Array = await zip.file("META-INF/container.xml").async("uint8array");
        const container: string = this.decodeXml(containerBytes);
        const parser: DOMParser = new DOMParser();
        const doc: Document = parser.parseFromString(container, "text/xml");
        const rootFile: string = doc.getElementsByTagName("rootfile")[0].getAttribute("full-path");
        const xmlBytes: Uint8Array = await zip.file(rootFile).async("uint8array");
        return this.decodeXml(xmlBytes);
    }

    public static MXLtoXMLstring(data: string | Blob): Promise<string> {
        const zip:  JSZip = new JSZip();
        return zip.loadAsync(data).then(
            async (_: any) => {
                return this.jszipToXMLstring(zip);
            },
            (err: any) => {
                log.error(err);
                throw err;
            }
        );
    }
}
