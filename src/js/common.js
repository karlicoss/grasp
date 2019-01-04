/* @flow */
export const CAPTURE_SELECTED_METHOD = 'captureSelected';


export function showNotification(text: string, priority: number=0) {
    if (Notification.permission !== "granted") {
        Notification.requestPermission();
    } else {
        // TODO ugh. is there no way to show in-browser only notification??
        const notification = new Notification(
            'grasp-notification',
            // $FlowFixMe
            {
                title: 'Grasp extension',
                body: text,
                priority: priority,
            },
        );
    }
}
