# syntax=docker/dockerfile:1

# ---------- Build stage: JDK + Maven wrapper ----------
FROM eclipse-temurin:21-jdk AS build
WORKDIR /build

# Dependencies first, so they are cached until pom.xml changes.
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN sed -i 's/\r$//' mvnw && chmod +x mvnw && ./mvnw -B -q dependency:go-offline

COPY src/ src/
# Tests run outside the image (mvnw test); the image build only packages the jar.
RUN ./mvnw -B -q package -DskipTests && cp target/claims-server-*.jar app.jar

# ---------- Runtime stage: JRE only ----------
FROM eclipse-temurin:21-jre
WORKDIR /app

RUN groupadd --system app && useradd --system --gid app --home-dir /app app \
    && mkdir -p /app/data && chown -R app:app /app

COPY --from=build --chown=app:app /build/app.jar app.jar

USER app

# H2 file database lives here (jdbc:h2:file:./data/db); mount a volume to keep data across containers.
VOLUME ["/app/data"]
EXPOSE 8080

ENV SPRING_PROFILES_ACTIVE=docker \
    JAVA_OPTS="-XX:MaxRAMPercentage=75"

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
