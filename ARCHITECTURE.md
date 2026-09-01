# ScrapScout diagram / layout

```text
┌──────────────────────────────────────────────────────────┐
│                       SCRAPSCOUT                          │
│                   Vehicle Deal Finder                    │
└───────────────────────────┬──────────────────────────────┘
                            ▼
┌──────────────────────────────────────────────────────────┐
│ SEARCH UI: Make/Model • Price • Location • Radius        │
└───────────────────────────┬──────────────────────────────┘
                            ▼
┌──────────────────────────────────────────────────────────┐
│ EXPRESS SERVER: /api/search + /api/health                │
└───────────────────────────┬──────────────────────────────┘
                 ┌──────────┴──────────┐
                 ▼                     ▼
       ┌──────────────────┐   ┌──────────────────┐
       │ FACEBOOK/CAPTAPI │   │ GUMTREE PROVIDER │
       │ Bearer API key   │   │ optional adapter │
       └────────┬─────────┘   └────────┬─────────┘
                └──────────┬───────────┘
                           ▼
             ┌──────────────────────────┐
             │ NORMALISED LISTINGS      │
             │ price • image • URL etc. │
             └────────────┬─────────────┘
                          ▼
        ┌─────────────────┴─────────────────┐
        ▼                                   ▼
┌──────────────────┐              ┌────────────────────┐
│ DEAL RESULTS     │              │ PROFIT CALCULATOR  │
│ cheap cars first │              │ scrap+cats-costs   │
└──────────────────┘              └────────────────────┘
```

### Mobile screen
```text
┌────────────────────────────┐
│ SS ScrapScout       API ✓  │
├────────────────────────────┤
│ FIND • SCORE • PROFIT      │
│ Find cheap cars...         │
│                            │
│ 1 Search → 2 Fetch        │
│ → 3 Score → 4 Profit      │
│                            │
│ LIVE SEARCH                │
│ Source: Facebook/Gumtree  │
│ Make/model                │
│ [ BMW                    ] │
│ Max price                 │
│ [ £500                   ] │
│ Location                  │
│ [ Liverpool              ] │
│ Radius                    │
│ [ 10 miles               ] │
│ [       SEARCH NOW       ] │
│                            │
│ RESULTS                    │
│ ┌────────────────────────┐ │
│ │ image                  │ │
│ │ BMW 320d               │ │
│ │ £450                   │ │
│ │ Liverpool              │ │
│ └────────────────────────┘ │
│                            │
│ QUICK PROFIT CALCULATOR    │
│ Buy / Scrap / Cats / Cost │
│ Estimated profit: £XXX    │
└────────────────────────────┘
```
