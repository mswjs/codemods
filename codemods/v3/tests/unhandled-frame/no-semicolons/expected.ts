import { setupServer } from 'msw/node'
import { HttpNetworkFrame } from 'msw/experimental'

export const server = setupServer()

beforeAll(() => {
    server.listen({
        onUnhandledFrame: ({ frame, defaults }) => {
            if (!(frame instanceof HttpNetworkFrame)) {
                return
            }

            const request = frame.data.request
            console.log(request.url)
            defaults.warn()
        },
    })
})
