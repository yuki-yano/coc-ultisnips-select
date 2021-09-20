import { CompleteResult, events, ExtensionContext, sources, VimCompleteItem, workspace } from 'coc.nvim';
import fs from 'fs';

type Snippets = {
  [word: string]: {
    location: string;
    description: string;
  };
};

export const activate = async (context: ExtensionContext): Promise<void> => {
  context.subscriptions.push(
    sources.createSource({
      name: 'ultisnips-select',
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
    if (item.menu !== '[ultisnips]') {
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
        word,
        info: `[${info.description}]\n\n${snipText.join('\n')}`,
        menu: '[ultisnips]',
        dup: 1,
      };
    }),
  };
};
