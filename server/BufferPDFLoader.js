import { BaseDocumentLoader } from 'langchain/document_loaders';
import pdfParse from 'pdf-parse';
import { Document } from 'langchain/document';

// 这个 BufferPDFLoader 会把内存中的 PDF Buffer 转成可用于后续 Text Split、Embedding 的文档数据。
export class BufferPDFLoader extends BaseDocumentLoader {
  constructor(buffer) {
    super();
    this.buffer = buffer;
  }

  async load() {
    // 用 pdf-parse 将 PDF 的 Buffer 解析为文本
    const data = await pdfParse(this.buffer);
    // 返回一个 Document 数组（LangChain 里一个文档就对应一个 Document 对象）
    return [
      new Document({
        pageContent: data.text,
        metadata: {}, // 这里可以放一些额外的元信息
      }),
    ];
  }
}
