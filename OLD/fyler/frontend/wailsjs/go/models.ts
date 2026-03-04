export namespace main {
	
	export class Document {
	    id: string;
	    path: string;
	    name: string;
	    pageCount: number;
	    pageSpec: string;
	
	    static createFrom(source: any = {}) {
	        return new Document(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.path = source["path"];
	        this.name = source["name"];
	        this.pageCount = source["pageCount"];
	        this.pageSpec = source["pageSpec"];
	    }
	}
	export class MergeInput {
	    path: string;
	    pageSpec: string;
	
	    static createFrom(source: any = {}) {
	        return new MergeInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.pageSpec = source["pageSpec"];
	    }
	}
	export class MergeRequest {
	    inputs: MergeInput[];
	    outputPath: string;
	
	    static createFrom(source: any = {}) {
	        return new MergeRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.inputs = this.convertValues(source["inputs"], MergeInput);
	        this.outputPath = source["outputPath"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

