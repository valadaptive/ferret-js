def i1 main {
  i = 1
  br i :existent :nonexistent
existent:
  ret 2
}
