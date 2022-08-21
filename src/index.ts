import { CompleteResult, events, ExtensionContext, sources, VimCompleteItem, workspace } from 'coc.nvim';
import fs from 'fs';

type Snippets = {
  [word: string]: {
    location: string;
    description: string;
  };
};

const sourceName = 'ultisnips-select';

export const activate = async (context: ExtensionContext): Promise<void> => {
  const extensionConfig = workspace.getConfiguration('ultisnips-select');
  const isEnable = extensionConfig.enable;
  if (!isEnable) return;

  context.subscriptions.push(
    sources.createSource({
      name: sourceName,
      shortcut: 'ultisnips',
      doComplete: async (option) => {
        if (option.input === '') {
          return {
            items: [],
          };
        }

        const items = await getCompletionItems();
        return items;
      },
    })
  );

  events.on('CompleteDone', async (item: VimCompleteItem) => {
    if (item.source !== sourceName) {
      return;
    }

    await workspace.nvim.call('UltiSnips#ExpandSnippet', []);
  });
};

const getCompletionItems = async (): Promise<CompleteResult> => {
  await workspace.nvim.call('UltiSnips#SnippetsInCurrentScope', [1]);
  const snippets = (await workspace.nvim.getVar('current_ulti_dict_info')) as Snippets;

  return {
    items: Object.entries(snippets).map(([word, info]) => {
      const [filePath, lineNumber] = info.location.split(':');
      const lines = fs.readFileSync(filePath).toString().split('\n') as Array<string>;

      let snipText: Array<string> = [];

      for (const line of lines.slice(Number(lineNumber))) {
        if (line === 'endsnippet') {
          break;
        }
        snipText = [...snipText, line];
      }

      return {
        kind: ' ',
        word,
        info: `[${info.description}]\n\n${snipText.join('\n')}`,
        dup: 1,
      };
    }),
  };
};
