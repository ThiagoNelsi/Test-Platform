# Future Improvements

## 2026-09-27

### RAG agêntico com recuperação iterativa

- **Deferred:** Um agente decidir quais assuntos buscar, avaliar a suficiência do contexto e pedir novos trechos antes de gerar questões.
- **Current scope boundary:** Esta implementação adiciona reranking à recuperação existente, mantendo uma busca por geração.
- **Future value:** Pedidos abrangentes podem exigir consultas distintas e expansão do contexto conforme as evidências encontradas.
- **Revisit when:** Após estabilizar o reranking. O retrieval já expõe contexto e referências sem geração, com limites de candidatos, pais, caracteres e timeout configuráveis por chamada. Definir orçamento de chamadas, latência e condição de parada antes de implementar o ciclo.

### Calibrar seleção de contexto por score

- **Deferred:** Definir um score mínimo de relevância e rever os limites padrão de contexto.
- **Current scope boundary:** Por ora, o score serve apenas para ordenar; preservam-se os padrões de 40 candidatos, 5 pais e 14 mil caracteres.
- **Future value:** Evitar contexto irrelevante e ajustar cobertura para livros e slides.
- **Revisit when:** Houver exemplos representativos e evidências para calibrar os cortes sem descartar material útil.
