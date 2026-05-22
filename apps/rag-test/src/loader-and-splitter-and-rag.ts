import 'cheerio';
import { Document } from '@langchain/core/documents';
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory';
import { OpenAIEmbeddings } from '@langchain/openai';
import { CheerioWebBaseLoader } from '@langchain/community/document_loaders/web/cheerio';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { getLlmModel, getEmbeddingsModel } from '@llm/shared';

(async () => {
    const model = getLlmModel({
        provider: 'qwen',
    });

    const embeddingsModel = getEmbeddingsModel({
        provider: 'qwen',
    });

    const cheerioLoader = new CheerioWebBaseLoader(
        'https://juejin.cn/post/7233327509919547452',
        {
            selector: '.main-area p',
        }
    );

    const documents = await cheerioLoader.load();

    console.assert(documents.length === 1);
    console.log(`Total characters: ${documents[0].pageContent.length}`);

    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 500, // 每个分块的字符数
        chunkOverlap: 50, // 分块之间的重叠字符数
        separators: ['。', '！', '？'], // 分割符，优先使用段落分隔
    });

    const splitDocuments = await textSplitter.splitDocuments(documents);

    console.log(`文档分割完成，共 ${splitDocuments.length} 个分块\n`);

    // 用嵌入模型把这些文档向量化之后存入向量数据库
    const vectorStore = await MemoryVectorStore.fromDocuments(
        splitDocuments,
        embeddingsModel
    );
    console.log('向量存储创建完成\n');

    // 获取检索器，k:2 表示返回余弦相似度最大的 2 个 Document。
    const retriever = vectorStore.asRetriever({ k: 2 });

    const questions = ['父亲的去世对作者的人生态度产生了怎样的根本性逆转？'];

    for (const question of questions) {
        console.log('='.repeat(40));
        console.log(`问题: ${question}`);
        console.log('='.repeat(40));

        // 使用 similaritySearchWithScore 获取相似度评分
        const scoredResults = await vectorStore.similaritySearchWithScore(
            question,
            2
        );

        // 实际上 scoredResults 已经包含了相关的文档和相关性，不需要调用 const retrievedDocs = await retriever.invoke(question);
        // scoredResults 的结构如下：
        // [
        //     [
        //       Document {
        //         pageContent: '。但我也看开了，少一百万多一百万对我影响大么？并不大，我还是每天花那些钱。相比之下，我爸的去世对我的打击更大，这对我的影响远远大于 100 万。我对钱没有太大的追求，对很多别人看重的东西也没啥追求。可能有的人有了钱，有了时间会选择环游中国，环游世界，我想我不会。我就喜欢宅在家里，写写东西、看看小说、打打游戏，这样活到去世我也不会有遗憾。我所追求的事情，在我小时候可能是想学医，一直觉得像火影里的纲手那样很酷，或者像大蛇丸那样研究一些东西也很酷。但近些年了解了学医其实也是按照固定的方法来治病，可能也是同样的东西重复好多年，并不是我想的那样。人这一辈子能把一件事做好就行。也就是要找到自己一生的使命，我觉得我找到了：我想写一辈子的技术文章。据说最高级的快乐有三种来源：自律、爱、创造。写文章对我来说就很快乐，我想他就是属于创造的那种快乐。此外，我还想把我的故事写下来，我成长的故事，我和东东的故事，那些或快乐或灰暗的日子，今生我一定会把它们写下来，只是现在时机还不成熟。世界那么大，我并不想去看看。我只想安居一隅，照顾好家人，写一辈子的技术文章，也写下自己的故事。这就是我的平凡之路',
        //         metadata: [Object],
        //         id: undefined
        //       },
        //       0.7794038387582577
        //     ],
        // ]

        // 打印用到的文档和相似度评分
        console.log('\n【检索到的文档及相似度评分】');

        scoredResults.forEach(([doc, score], i) => {
            const similarity = score !== null ? score.toFixed(4) : 'N/A';
            console.log(`\n[文档 ${i + 1}] 相似度: ${similarity}`);
            console.log(`内容: ${doc.pageContent}`);
            if (doc.metadata && Object.keys(doc.metadata).length > 0) {
                console.log(`元数据:`, doc.metadata);
            }
        });

        // 构建 prompt
        const context = scoredResults
            .map(([doc], i) => `[片段${i + 1}]\n${doc.pageContent}`)
            .join('\n\n━━━━━\n\n');

        const prompt = `你是一个文章辅助阅读助手，根据文章内容来解答：

            文章内容：
            ${context}

            问题: ${question}

            你的回答:`;

        console.log('\n【AI 回答】');
        const response = await model.invoke(prompt);
        console.log(response.content);
        console.log('\n');
    }
})();
