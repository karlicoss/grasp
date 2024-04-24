from datetime import datetime
import re
from typing import List, Optional

DEFAULT_TEMPLATE = "* %U %:description %:tags\n%:link\n%:initial\n"

# TODO reuse inorganic/orgparse??
def date2org(t: datetime) -> str:
    return t.strftime("%Y-%m-%d %a")

def datetime2orgtime(t: datetime) -> str:
    return t.strftime("%H:%M")

def datetime2org(t: datetime) -> str:
    return date2org(t) + " " + datetime2orgtime(t)


def empty(s) -> bool:
    return s is None or len(s.strip()) == 0


# TODO protocol??
# TODO put template in config??
class Config:
    @staticmethod
    def format_selection(selection: str) -> List[str]:  # type: ignore[empty-body]
        ...

    @staticmethod
    def format_comment(comment: str) -> List[str]:  # type: ignore[empty-body]
        ...


class DefaultConfig(Config):
    @staticmethod
    def format_selection(selection: str) -> List[str]:
        return [
            'Selection:',
            selection,
        ]


    @staticmethod
    def format_comment(comment: str) -> List[str]:
        return [
            'Comment:',
            comment
        ]


def as_org(
        url: str,
        title: str,
        selection: str,
        comment: str,
        tags: List[str],
        org_template: str,
        config: Optional[Config] = None,
        *,
        _now=None,
):
    """
Formats captured results according to org template. Supports all sensible (e.g. non-interactive) template expansions from https://orgmode.org/manual/Template-expansion.html#Template-expansion.

Additionally, supports :selection, :comment and :tags expansions.

You can look at `test_templates` for some specific examples.
    """
    py_template = re.sub(r'([^\\])%[:]?([?\w]+)', r'\1{\2}', org_template)
    # replace all escaped % with regular %, safe to do after substitution
    py_template = py_template.replace(r'\%', '%')

    NOW = datetime.now() if _now is None else _now
    org_date = date2org(NOW)
    org_datetime = datetime2org(NOW)

    tags_s = '' if len(tags) == 0 else (':' + ':'.join(tags) + ':')

    if config is None:
        config = DefaultConfig()

    # TODO tabulate selection and comments?
    # TODO not sure, maybe add as org quote?
    parts = []
    if not empty(selection):
        parts.extend(config.format_selection(selection))
    if not empty(comment):
        parts.extend(config.format_comment(comment))
    initial = '\n'.join(parts)

    res = py_template.format(
        t=f'<{org_date}>',
        u=f'[{org_date}]',
        T=f'<{org_datetime}>',
        U=f'[{org_datetime}]',
        description=title,
        link=url,

        initial=initial,
        i=initial,

        tags=tags_s,
        selection=selection,
        comment=comment,
        annotation=f'[[{url}][{title}]]', # https://orgmode.org/manual/capture-protocol.html
        **{'?': ''}, # just ignore it
    )
    return res


def test_templates() -> None:
    url = 'https://whatever'
    title = 'hello'
    selection = """some
    selected
       text
    """
    comment = 'fafewfewf'
    tags = ['aba', 'caba']

    vimzettel_template = r'zettel \%title [%:description] testing'
    # https://orgmode.org/guide/Capture-templates.html
    org_templates = [
        DEFAULT_TEMPLATE,
        "* %? [[%:link][%:description]] \nCaptured On: %U",
        "* %:annotation",
        "* %U %:description :protocol: \n %:link \n%:initial \n\n",
        "* %t captured stuff %:tags \n ",
        "\n** Selection\n%:selection\n** Comment\n%:comment\n",
        """* TODO [#A] %:link
** Selection
%:selection
** Comment
%:comment
        """,
        """* %T %:link %:description
#+BEGIN_QUOTE
%:selection
#+END_QUOTE
        """,
        vimzettel_template,
    ]
    # check they aren't crashing
    for org_template in org_templates:
        res = as_org(
            url,
            title,
            selection,
            comment,
            tags,
            org_template=org_template

        )
        print()
        print(res)
    res = as_org(
        url,
        title,
        selection,
        comment,
        tags,
        org_template=DEFAULT_TEMPLATE,
        _now=datetime(1111, 11, 11),
    )
    expected = '''
* [1111-11-11 Sat 00:00] hello :aba:caba:
https://whatever
Selection:
some
    selected
       text
    
Comment:
fafewfewf
'''.lstrip()
    assert res == expected

    res = as_org(
        url,
        title,
        selection,
        comment,
        tags,
        org_template=vimzettel_template,
    )
    assert res == 'zettel %title [hello] testing'
