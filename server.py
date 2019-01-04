"""First API, local access only"""
import hug # type: ignore
import hug.types as T # type: ignore



@hug.local()
@hug.post('/capture')
def capture(
        url: T.text,
        selection: T.Nullable(T.text),
        comment: T.Nullable(T.text),
):
    # TODO can even configure the path in browser? but fine for now..
    print("HELOOO")
    """Says happy birthday to a user"""
    print(url, selection, comment)
    return {}
    # return {'message': 'Happy {0} Birthday {1}!'.format(age, name),
    #         'took': float(hug_timer)}
