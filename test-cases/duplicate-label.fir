def i1 main {
  i = 1
  br i :label1 :label2
label1:
  ret 2
label2:
  ret 3
label1:
  ret 4
}
