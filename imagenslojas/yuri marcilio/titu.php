<?php
/*
  Arrays=Variais com diversas chaves!
*/
//$nome=array('Guilherme','Joao','Felipe');
//$nome[]='joao';
//$nome[]='Felipe';
//$nome[0]='Joao';
//$nome[100]='Felipe';		
$variaveis=['Guilherme','Joao','Felipe'];

//estava tentando buscar algo que nao estava atribuido pois estava documentado ja que estava no "//" e logo epois q eu //o removi o codigo funcionou

echo $variaveis[0];
//$variaveis=array('Guilherme',23,true,10.09);
$informacao['nome']='Guilherme';
$informacao['idade']=23;
$informacao['cidade']='Florianopolis';
echo $informacao['nome'];
echo '<br/>';
echo $informacao['idade'];
echo '<br/>';
echo $informacao['cidade'];
?>