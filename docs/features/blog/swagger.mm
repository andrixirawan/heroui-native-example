openapi: 3.0.3
info:
  title: Blog API
  version: 1.0.0
  description: |
    Swagger spec untuk fitur blog.
    Endpoint dibagi menjadi:
    - Protected API (wajib login + onboarding selesai)
    - Public API (tanpa auth)

servers:
  - url: /
    description: Same-origin API server

tags:
  - name: Blog Protected
  - name: Blog Public

paths:
  /api/blogs:
    get:
      tags: [Blog Protected]
      summary: List semua blog (protected)
      security:
        - bearerAuth: []
        - cookieAuth: []
      responses:
        "200":
          description: Success
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/Blog"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "403":
          $ref: "#/components/responses/Forbidden"
        "500":
          $ref: "#/components/responses/InternalServerError"
    post:
      tags: [Blog Protected]
      summary: Create blog (slug otomatis dari title)
      security:
        - bearerAuth: []
        - cookieAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateBlogRequest"
      responses:
        "201":
          description: Created
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Blog"
        "400":
          $ref: "#/components/responses/BadRequest"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "403":
          $ref: "#/components/responses/Forbidden"
        "500":
          $ref: "#/components/responses/InternalServerError"

  /api/blogs/{slug}:
    get:
      tags: [Blog Protected]
      summary: Get detail blog by slug (protected)
      security:
        - bearerAuth: []
        - cookieAuth: []
      parameters:
        - $ref: "#/components/parameters/SlugParam"
      responses:
        "200":
          description: Success
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Blog"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "403":
          $ref: "#/components/responses/Forbidden"
        "404":
          $ref: "#/components/responses/NotFound"
        "500":
          $ref: "#/components/responses/InternalServerError"
    patch:
      tags: [Blog Protected]
      summary: Update blog by slug
      description: Jika `title` berubah, slug akan otomatis di-regenerate.
      security:
        - bearerAuth: []
        - cookieAuth: []
      parameters:
        - $ref: "#/components/parameters/SlugParam"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/UpdateBlogRequest"
      responses:
        "200":
          description: Success
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Blog"
        "400":
          $ref: "#/components/responses/BadRequest"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "403":
          $ref: "#/components/responses/Forbidden"
        "404":
          $ref: "#/components/responses/NotFound"
        "409":
          description: Gagal generate slug unik
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"
              example:
                error: Failed to generate unique slug. Please retry.
        "500":
          $ref: "#/components/responses/InternalServerError"
    delete:
      tags: [Blog Protected]
      summary: Delete blog by slug
      security:
        - bearerAuth: []
        - cookieAuth: []
      parameters:
        - $ref: "#/components/parameters/SlugParam"
      responses:
        "200":
          description: Deleted
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/MessageResponse"
              example:
                message: Blog deleted successfully.
        "401":
          $ref: "#/components/responses/Unauthorized"
        "403":
          $ref: "#/components/responses/Forbidden"
        "404":
          $ref: "#/components/responses/NotFound"
        "500":
          $ref: "#/components/responses/InternalServerError"

  /api/public/blogs:
    get:
      tags: [Blog Public]
      summary: List public blogs (Laravel style pagination)
      parameters:
        - in: query
          name: page
          schema:
            type: integer
            minimum: 1
            default: 1
          description: Nomor halaman
        - in: query
          name: per_page
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 15
          description: Jumlah data per halaman
      responses:
        "200":
          description: Success
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/BlogPagination"
        "500":
          $ref: "#/components/responses/InternalServerError"

  /api/public/blogs/{id}:
    get:
      tags: [Blog Public]
      summary: Get public blog by id (ULID)
      parameters:
        - $ref: "#/components/parameters/IdParam"
      responses:
        "200":
          description: Success
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Blog"
        "400":
          description: Invalid blog id
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"
              example:
                error: Invalid blog id.
        "404":
          $ref: "#/components/responses/NotFound"
        "500":
          $ref: "#/components/responses/InternalServerError"

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: Bisa pakai session token via Authorization Bearer
    cookieAuth:
      type: apiKey
      in: cookie
      name: better-auth.session_token
      description: Session cookie Better Auth

  parameters:
    SlugParam:
      in: path
      name: slug
      required: true
      schema:
        type: string
      description: Slug blog
    IdParam:
      in: path
      name: id
      required: true
      schema:
        type: string
      description: ULID blog id

  responses:
    BadRequest:
      description: Bad request
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/ErrorResponse"
          example:
            error: Invalid blog payload.
    Unauthorized:
      description: Unauthorized
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/ErrorResponse"
          example:
            error: Unauthorized
    Forbidden:
      description: Forbidden
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/ErrorResponse"
          example:
            error: Onboarding required before accessing this endpoint.
    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/ErrorResponse"
          example:
            error: Blog not found.
    InternalServerError:
      description: Internal server error
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/ErrorResponse"
          example:
            error: Failed to fetch blogs

  schemas:
    Blog:
      type: object
      required: [id, title, slug, body, timestamp]
      properties:
        id:
          type: string
          description: ULID blog id
          example: 01JSA2M8CS1Y04QPG7HD3YBK2E
        title:
          type: string
          example: Panduan Memulai Next.js untuk Aplikasi Internal Tim
        media:
          type: string
          nullable: true
          example: https://picsum.photos/seed/blog-1/1200/675
        slug:
          type: string
          example: panduan-memulai-nextjs-untuk-aplikasi-internal-tim
        body:
          type: string
          example: Lorem ipsum dolor sit amet consectetur adipiscing elit...
        timestamp:
          type: string
          format: date-time
          example: "2026-04-14T15:00:00.000Z"

    CreateBlogRequest:
      type: object
      required: [title, body]
      properties:
        title:
          type: string
          minLength: 3
          maxLength: 200
        media:
          type: string
          nullable: true
          format: uri
        body:
          type: string
          minLength: 10
          maxLength: 50000

    UpdateBlogRequest:
      type: object
      description: Minimal satu field harus dikirim.
      properties:
        title:
          type: string
          minLength: 3
          maxLength: 200
        media:
          type: string
          nullable: true
          format: uri
        body:
          type: string
          minLength: 10
          maxLength: 50000

    LaravelPaginationLink:
      type: object
      required: [url, label, active]
      properties:
        url:
          type: string
          nullable: true
          example: http://localhost:3000/api/public/blogs?page=2
        label:
          type: string
          example: "2"
        active:
          type: boolean
          example: false

    BlogPagination:
      type: object
      required:
        - current_page
        - data
        - first_page_url
        - from
        - last_page
        - last_page_url
        - links
        - next_page_url
        - path
        - per_page
        - prev_page_url
        - to
        - total
      properties:
        current_page:
          type: integer
          example: 1
        data:
          type: array
          items:
            $ref: "#/components/schemas/Blog"
        first_page_url:
          type: string
          example: http://localhost:3000/api/public/blogs?page=1
        from:
          type: integer
          nullable: true
          example: 1
        last_page:
          type: integer
          example: 3
        last_page_url:
          type: string
          example: http://localhost:3000/api/public/blogs?page=3
        links:
          type: array
          items:
            $ref: "#/components/schemas/LaravelPaginationLink"
        next_page_url:
          type: string
          nullable: true
          example: http://localhost:3000/api/public/blogs?page=2
        path:
          type: string
          example: http://localhost:3000/api/public/blogs
        per_page:
          type: integer
          example: 15
        prev_page_url:
          type: string
          nullable: true
          example: null
        to:
          type: integer
          nullable: true
          example: 15
        total:
          type: integer
          example: 30

    ErrorResponse:
      type: object
      required: [error]
      properties:
        error:
          type: string
          example: Blog not found.

    MessageResponse:
      type: object
      required: [message]
      properties:
        message:
          type: string
          example: Blog deleted successfully.
