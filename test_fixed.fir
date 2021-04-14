def u32 length u8* {
init:
  p = eq *%0 \NUL   //are we at end-of-string?
//p = eq *%0 0x00     an alternative!
  br p :then :else  // gotos but fancy
then:
  ret 0
else:
  next = add *%0 1      //move pointer to next char
  *temp = *call length next //length of rest
  temp <- add length 1 //increment by one
  ret *temp
}

def i0 print u8* {
  n = call length %0
  write stdout %0 n // write char data to stdout handle
  //implied 'ret 0'
}

def i1 main { //boolean 0 for success, 1 for failure
  str = "Hello, world!\NUL" //str has type u8*
  call print str
  //another implied 'ret 0'
}
