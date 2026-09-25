import { setupServer } from 'msw/node'

export const server = setupServer()

beforeAll(() => {
    server.listen({
        onUnhandledRequest: (request, print) => {
            console.log(request.url)
            print.warning()
        },
    })
})
